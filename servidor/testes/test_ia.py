"""A IA contra um servidor FALSO no formato das duas APIs (nada vai para a OpenAI nem para a Anthropic):
o pedido leva o Catecismo, as citações são conferidas, a falta de crédito troca de lado e o teto de gasto vale."""
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import armazem as A
import config as C
import ia as IA
import textos

RESPOSTA = {"resumo": "Depende da situação.", "materia": "pode_ser_grave", "explicacao": ["Um parágrafo."],
            "catecismo": [{"n": 1857, "porque": "condições"}, {"n": 9999, "porque": "inventado"}],
            "biblia": [{"ref": "MAT.5.37", "porque": "sim, sim"}, {"ref": "XYZ.1.1", "porque": "inventado"}],
            "conselho": "Converse com um padre."}


class Falso(BaseHTTPRequestHandler):
    estado = {"claude_sem_credito": False, "pedidos": []}

    def log_message(self, *a):
        pass

    def do_POST(self):
        corpo = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        self.estado["pedidos"].append({"caminho": self.path, "corpo": corpo, "chave": self.headers.get("x-api-key") or self.headers.get("Authorization")})
        texto_pedido = json.dumps(corpo, ensure_ascii=False)
        if "consultas" in texto_pedido and "Não responda à pergunta" in texto_pedido:
            saida = {"consultas": ["mentira falso testemunho", "verdade"]}
        elif "revisa uma oração" in texto_pedido:
            saida = {"comentario": "Bonita.", "pontos_fortes": ["sincera"], "sugestoes": [{"trecho": "obrigado", "sugestao": "muito obrigado", "porque": "ênfase"}, {"trecho": "não existe no texto", "sugestao": "x", "porque": "y"}],
                     "alerta_doutrinal": "", "versao_revisada": "Senhor, muito obrigado. Amém"}
        else:
            saida = RESPOSTA
        if self.path.startswith("/claude"):
            if self.estado["claude_sem_credito"]:
                return self.responder(400, {"type": "error", "error": {"type": "invalid_request_error", "message": "Your credit balance is too low to access the Anthropic API."}})
            return self.responder(200, {"content": [{"type": "text", "text": json.dumps(saida)}], "stop_reason": "end_turn",
                                        "usage": {"input_tokens": 1000, "output_tokens": 200}})
        return self.responder(200, {"status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(saida)}]}],
                                    "usage": {"input_tokens": 1000, "output_tokens": 200}})

    def responder(self, status, corpo):
        dados = json.dumps(corpo).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)


class TestIa(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.falso = ThreadingHTTPServer(("127.0.0.1", 0), Falso)
        threading.Thread(target=cls.falso.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{cls.falso.server_address[1]}"
        cls.tmp = tempfile.TemporaryDirectory()
        cls.cfg = C.Config("pc", dados=Path(cls.tmp.name), porta=0, cadeado=False)
        cls.cfg.ia_falsa = False
        cls.cfg.chave_openai, cls.cfg.chave_claude = "sk-falsa-openai-123456", "sk-ant-falsa-123456"
        cls.cfg.url_openai, cls.cfg.url_claude = base + "/openai", base + "/claude"
        cls.cfg.teto_dia = 5.0
        cls.armazem = A.Armazem(Path(cls.tmp.name) / "t.db")
        cls.cic = textos.Catecismo(C.CACHE / "catecismo.json")
        cls.biblias = textos.Biblias(C.CACHE / "biblias", C.LIVROS)

    @classmethod
    def tearDownClass(cls):
        cls.falso.shutdown()
        cls.falso.server_close()
        cls.armazem.fechar()
        cls.tmp.cleanup()

    def setUp(self):
        Falso.estado["pedidos"].clear()
        Falso.estado["claude_sem_credito"] = False
        IA.DISJUNTOR.fechar("claude")
        IA.DISJUNTOR.fechar("openai")
        self.ia = IA.Ia(self.cfg, self.armazem)
        if not self.cic.disponivel():
            self.skipTest("sem o Catecismo no cache")

    def test_pergunta_leva_o_catecismo_e_confere_as_citacoes(self):
        r = self.ia.perguntar("Mentir para não magoar alguém é pecado?", self.cic, self.biblias)
        self.assertEqual(len(Falso.estado["pedidos"]), 2)               # consultas + resposta
        pedido = json.dumps(Falso.estado["pedidos"][1]["corpo"], ensure_ascii=False)
        self.assertIn("[CIC 1857]", pedido)                              # a base sobre o pecado vai sempre
        self.assertIn("Catecismo", pedido)
        self.assertTrue(Falso.estado["pedidos"][0]["caminho"].startswith("/claude"))   # padrão: Sonnet 5.5
        cic = {c["n"]: c for c in r["catecismo"]}
        self.assertTrue(cic[1857]["existe"] and "três condições" in cic[1857]["texto"])
        self.assertFalse(cic[9999]["existe"])
        bib = {b["ref"]: b for b in r["biblia"]}
        self.assertEqual(bib["XYZ.1.1"]["existe"], False)
        if self.biblias.disponiveis():
            self.assertTrue(bib["MAT.5.37"]["existe"])
        self.assertEqual(r["materia"], "pode_ser_grave")
        self.assertEqual(r["consultas"], ["mentira falso testemunho", "verdade"])

    def test_sem_credito_no_claude_vai_para_a_reserva(self):
        Falso.estado["claude_sem_credito"] = True
        r = self.ia.perguntar("Tatuagem é pecado?", self.cic, self.biblias)
        caminhos = [p["caminho"] for p in Falso.estado["pedidos"]]
        self.assertIn("/openai", caminhos)
        self.assertTrue(r["uso"][-1]["reserva"])
        self.assertEqual(r["uso"][-1]["modelo"], "gpt-6-luna")
        # o lado sem crédito fica de molho: o pedido seguinte já começa pela reserva
        Falso.estado["pedidos"].clear()
        self.ia.revisar("t", "Senhor, obrigado. Amém", self.cic)
        self.assertEqual(Falso.estado["pedidos"][0]["caminho"], "/openai")

    def test_revisao_marca_trecho_que_nao_esta_no_texto(self):
        r = self.ia.revisar("t", "Senhor, obrigado. Amém", self.cic)
        self.assertTrue(r["sugestoes"][0]["no_texto"])
        self.assertFalse(r["sugestoes"][1]["no_texto"])
        pedido = json.dumps(Falso.estado["pedidos"][0]["corpo"], ensure_ascii=False)
        self.assertIn("[CIC 2559]", pedido)

    def test_teto_de_gasto(self):
        self.armazem.definir_meta("gasto:" + IA.date.today().isoformat(), "999")
        try:
            with self.assertRaises(IA.ErroDaIa):
                self.ia.perguntar("Qualquer coisa?", self.cic, self.biblias)
            self.assertEqual(Falso.estado["pedidos"], [])
        finally:
            self.armazem.definir_meta("gasto:" + IA.date.today().isoformat(), "0")

    def test_gasto_e_somado(self):
        antes = self.ia.gasto_hoje()
        self.ia.revisar("t", "Senhor, obrigado. Amém", self.cic)
        self.assertGreater(self.ia.gasto_hoje(), antes)

    def test_sem_chave_erro_claro(self):
        cfg = C.Config("pc", dados=Path(self.tmp.name) / "x", porta=0, cadeado=False)
        cfg.ia_falsa, cfg.chave_openai, cfg.chave_claude = False, "", ""
        with self.assertRaises(IA.ErroDaIa) as ctx:
            IA.Ia(cfg, self.armazem).revisar("t", "Senhor, obrigado. Amém", self.cic)
        self.assertIn("chave", str(ctx.exception))

    def test_chave_nao_aparece_no_erro(self):
        self.assertNotIn("sk-falsa-openai-123456", IA._sem_a_chave("erro com sk-falsa-openai-123456", "sk-falsa-openai-123456"))


if __name__ == "__main__":
    unittest.main()
