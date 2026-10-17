"""O servidor de verdade, numa porta livre e com dados temporários: rotas, cadeado por senha,
sincronia com token e as travas de endereço. Nada aqui toca os dados reais nem a internet."""
import hashlib
import http.client
import json
import secrets
import tempfile
import threading
import unittest
from pathlib import Path

import config as C
import servidor as SV

SENHA = "cavalo-azul 42"


def gravar_hash(arquivo: Path, senha: str) -> None:
    sal = secrets.token_hex(16)
    derivado = hashlib.pbkdf2_hmac("sha256", senha.replace(" ", "").replace("-", "").encode(), bytes.fromhex(sal), 1000).hex()
    arquivo.write_text(json.dumps({"sal": sal, "iteracoes": 1000, "hash": derivado}), encoding="utf-8")


class Base(unittest.TestCase):
    modo = "demo"

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        dados = Path(cls.tmp.name)
        if cls.modo == "servidor":
            gravar_hash(dados / "senha.json", SENHA)
            (dados / "token.txt").write_text("token-de-teste", encoding="utf-8")
        cfg = C.Config(cls.modo, dados=dados, porta=0, cadeado=False)
        cfg.host = "127.0.0.1"
        cfg.chave_openai = cfg.chave_claude = ""
        cfg.url_openai = cfg.url_claude = "http://127.0.0.1:9/nunca"
        cls.srv, cls.app = SV.criar(cfg)
        cls.porta = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()
        cls.app.armazem.fechar()
        cls.tmp.cleanup()

    def pedir(self, metodo, caminho, corpo=None, cabecalhos=None):
        con = http.client.HTTPConnection("127.0.0.1", self.porta, timeout=10)
        h = {"Host": f"127.0.0.1:{self.porta}", **(cabecalhos or {})}
        dados = None
        if corpo is not None:
            dados = json.dumps(corpo).encode()
            h["Content-Type"] = "application/json"
        con.request(metodo, caminho, body=dados, headers=h)
        r = con.getresponse()
        texto = r.read()
        con.close()
        try:
            return r.status, json.loads(texto), dict(r.getheaders())
        except ValueError:
            return r.status, texto, dict(r.getheaders())


class TestDemo(Base):
    def test_estado(self):
        s, d, _ = self.pedir("GET", "/api/estado")
        self.assertEqual(s, 200)
        self.assertEqual(d["modo"], "demo")
        self.assertEqual(d["portao"]["tipo"], "nenhum")
        self.assertTrue(d["ia"]["falsa"])

    def test_pagina_e_csp(self):
        s, corpo, h = self.pedir("GET", "/")
        self.assertEqual(s, 200)
        self.assertIn(b"Orat", corpo)
        self.assertIn("default-src 'self'", h["Content-Security-Policy"])
        s, _, h = self.pedir("GET", "/vendor/arvore/index.html")
        if s == 200:
            self.assertIn("fonts.googleapis.com", h["Content-Security-Policy"])

    def test_caminho_para_fora_nao_sai_do_app(self):
        s, _, _ = self.pedir("GET", "/../servidor/config.py")
        self.assertEqual(s, 404)
        s, _, _ = self.pedir("GET", "/%2e%2e/versao.json")
        self.assertEqual(s, 404)

    def test_host_estranho_recusado(self):
        s, _, _ = self.pedir("GET", "/api/estado", cabecalhos={"Host": "evil.test"})
        self.assertEqual(s, 403)

    def test_origem_estranha_nao_grava(self):
        s, _, _ = self.pedir("PUT", "/api/dados/config/x", {"valor": 1}, {"Origin": "http://evil.test"})
        self.assertEqual(s, 403)

    def test_dados_ida_e_volta(self):
        s, _, _ = self.pedir("PUT", "/api/dados/oracoes/o1", {"valor": {"titulo": "Teste"}})
        self.assertEqual(s, 200)
        s, d, _ = self.pedir("GET", "/api/dados/oracoes")
        self.assertEqual(d["itens"]["o1"]["titulo"], "Teste")
        s, _, _ = self.pedir("POST", "/api/dados/lidos/lote", {"itens": {"GEN.1": {"l": 1}, "GEN.2": {"l": 1}}})
        self.assertEqual(s, 200)
        self.pedir("POST", "/api/dados/lidos/lote", {"itens": {"GEN.2": None}})
        s, d, _ = self.pedir("GET", "/api/dados/lidos")
        self.assertEqual(sorted(d["itens"]), ["GEN.1"])
        s, _, _ = self.pedir("GET", "/api/dados/inventada")
        self.assertEqual(s, 404)

    def test_sem_cadeado_trancadas_abrem(self):
        s, _, _ = self.pedir("PUT", "/api/dados/vigia/retrato", {"valor": {"inicio": 1}})
        self.assertEqual(s, 200)

    def test_ia_de_demonstracao(self):
        s, d, _ = self.pedir("POST", "/api/ia/perguntar", {"pergunta": "Faltar à missa é pecado?"})
        if not self.app.catecismo.disponivel():
            self.assertEqual(s, 502)
            return
        self.assertEqual(s, 200)
        self.assertTrue(any(c["n"] == 1857 and c["existe"] for c in d["catecismo"]))
        self.assertTrue(d["salva"])
        s, d, _ = self.pedir("POST", "/api/ia/revisar", {"titulo": "x", "texto": "Senhor, obrigado por hoje. Amém"})
        self.assertEqual(s, 200)

    # ── a extensão da nova aba, em segundo plano ──────────────────────

    EXT = {"Origin": "chrome-extension://cidbkemhlibfkhcikiaiiiadoomaginl"}

    def test_ponte_estado_lista_lidos_e_pendentes(self):
        self.pedir("PUT", "/api/dados/lidos/GEN.1", {"valor": {"l": 1}})
        self.pedir("PUT", "/api/dados/vigia/pendente:t1", {"valor": {"tipo": "recair", "em": 1000, "aplicado": False}})
        self.pedir("PUT", "/api/dados/vigia/pendente:t2", {"valor": {"tipo": "vontade", "em": 2000, "aplicado": 5}})
        s, d, _ = self.pedir("GET", "/api/ponte/estado")
        self.assertEqual(s, 200)
        self.assertIn("GEN.1", d["lidos"])
        self.assertEqual([p["k"] for p in d["pendentes"]], ["pendente:t1"])     # o já aplicado não volta
        self.assertTrue(d["visto"] is None or isinstance(d["visto"], list))   # o que a extensão já tinha visto (ou nada, na primeira vez)

    def test_ponte_aplicar_grava_marca_e_retrato(self):
        self.pedir("PUT", "/api/dados/vigia/pendente:t3", {"valor": {"tipo": "recair", "em": 1000, "aplicado": False}})
        corpo = {"marcar": ["LUK.1", "PSA.22"], "desmarcar": ["GEN.1"], "visto": ["LUK.1", "PSA.23"],
                 "retrato": {"inicio": 111, "recorde": 222, "vencidas": 3, "tentativasHoje": 1, "lidoEm": 333,
                             "recaidas": [{"em": 5, "durou": 6}], "ligado": False, "excecoes": ["x"]},
                 "aplicados": ["pendente:t3", "lidos:GEN.1", "pendente:inexistente"]}
        s, _, _ = self.pedir("POST", "/api/ponte/aplicar", corpo, self.EXT)
        self.assertEqual(s, 200)
        a = self.app.armazem
        self.assertEqual(a.ler("lidos", "LUK.1"), {"l": 1})
        self.assertIsNone(a.ler("lidos", "GEN.1"))
        retrato = a.ler("vigia", "retrato")
        self.assertEqual((retrato["inicio"], retrato["vencidas"], retrato["origem"]), (111, 3, "nova-aba"))
        self.assertNotIn("ligado", retrato)            # só o contador entra, nada da proteção
        self.assertNotIn("excecoes", retrato)
        self.assertTrue(a.ler("vigia", "pendente:t3")["aplicado"])
        self.assertIsNone(a.ler("vigia", "lidos:GEN.1"))   # só "pendente:*" é marcado como aplicado
        self.assertEqual(a.ler("config", "novaAbaVisto")["refs"], ["LUK.1", "PSA.23"])
        s, d, _ = self.pedir("GET", "/api/estado")
        self.assertGreater(d["ponte"]["quando"], 0)
        self.assertEqual(d["ponte"]["trouxe"], 2)

    def test_ponte_so_aceita_a_origem_da_extensao(self):
        corpo = {"marcar": [], "desmarcar": [], "visto": []}
        for origem in ("http://evil.test", "chrome-extension://outraextensaoqualquer", "http://127.0.0.1:1"):
            s, _, _ = self.pedir("POST", "/api/ponte/aplicar", corpo, {"Origin": origem})
            self.assertEqual(s, 403, origem)
        s, _, _ = self.pedir("POST", "/api/ponte/aplicar", corpo, self.EXT)
        self.assertEqual(s, 200)
        # a origem da extensão não vale em nenhuma outra rota que muda coisa
        s, _, _ = self.pedir("PUT", "/api/dados/config/x", {"valor": 1}, self.EXT)
        self.assertEqual(s, 403)

    def test_ponte_recusa_capitulo_invalido(self):
        for ruim in (["../x"], ["GEN.1; drop"], [1], ["gen.1"], ["GEN.1000"]):
            s, _, _ = self.pedir("POST", "/api/ponte/aplicar", {"marcar": ruim, "desmarcar": [], "visto": []}, self.EXT)
            self.assertEqual(s, 400, ruim)

    def test_sincronia_recusada_fora_do_servidor(self):
        s, _, _ = self.pedir("POST", "/api/sincronia", {"itens": []}, {"Authorization": "Bearer x"})
        self.assertEqual(s, 404)

    def test_biblia_e_catecismo(self):
        s, d, _ = self.pedir("GET", "/api/biblia/AM/JHN/3")
        if s == 404:
            self.skipTest("sem a Bíblia no cache")
        self.assertIn("amou o mundo", d["versos"][15])
        s, d, _ = self.pedir("GET", "/api/biblia/AM/versos?refs=PSA.22.1")
        self.assertIn("pastor", d["versos"]["PSA.22.1"][0]["texto"])
        s, d, _ = self.pedir("GET", "/api/catecismo/1857")
        if s == 200:
            self.assertIn("três condições", d["texto"])


class TestServidorDeCasa(Base):
    modo = "servidor"

    def test_trancado_sem_cookie(self):
        s, d, _ = self.pedir("GET", "/api/portao")
        self.assertEqual(d["tipo"], "senha")
        self.assertFalse(d["aberto"])
        s, _, _ = self.pedir("GET", "/api/dados/vigia")
        self.assertEqual(s, 423)
        s, _, _ = self.pedir("GET", "/api/dados/colinha")
        self.assertEqual(s, 423)
        s, _, _ = self.pedir("GET", "/api/dados/oracoes")   # o resto continua aberto
        self.assertEqual(s, 200)

    def test_senha_errada_e_certa(self):
        s, d, _ = self.pedir("POST", "/api/portao/destravar", {"senha": "errada"})
        self.assertEqual(s, 403)
        s, d, h = self.pedir("POST", "/api/portao/destravar", {"senha": SENHA})
        self.assertEqual(s, 200)
        cookie = h["Set-Cookie"].split(";")[0]
        self.assertIn("HttpOnly", h["Set-Cookie"])
        s, _, _ = self.pedir("GET", "/api/dados/vigia", cabecalhos={"Cookie": cookie})
        self.assertEqual(s, 200)
        s, _, _ = self.pedir("GET", "/api/dados/vigia", cabecalhos={"Cookie": cookie[:-3] + "xyz"})
        self.assertEqual(s, 423)

    def test_sincronia_com_token(self):
        s, _, _ = self.pedir("POST", "/api/sincronia", {"itens": []}, {"Authorization": "Bearer errado"})
        self.assertEqual(s, 401)
        itens = [{"c": "lidos", "id": "MAT.1", "v": {"l": 1}, "em": 1000, "x": False}]
        s, d, _ = self.pedir("POST", "/api/sincronia", {"itens": itens, "desde": 0}, {"Authorization": "Bearer token-de-teste"})
        self.assertEqual(s, 200)
        self.assertTrue(any(i["id"] == "MAT.1" for i in d["itens"]))

    def test_servidor_de_casa_nao_conversa_com_a_extensao(self):
        s, _, _ = self.pedir("GET", "/api/ponte/estado")
        self.assertEqual(s, 404)
        s, _, _ = self.pedir("POST", "/api/ponte/aplicar", {"marcar": [], "desmarcar": [], "visto": []},
                             {"Origin": "chrome-extension://cidbkemhlibfkhcikiaiiiadoomaginl"})
        self.assertEqual(s, 403)

    def test_servidor_nao_se_atualiza_sozinho(self):
        s, _, _ = self.pedir("POST", "/api/atualizacao/aplicar", {})
        self.assertEqual(s, 400)


if __name__ == "__main__":
    unittest.main()
