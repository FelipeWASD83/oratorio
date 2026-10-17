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

    def test_servidor_nao_se_atualiza_sozinho(self):
        s, _, _ = self.pedir("POST", "/api/atualizacao/aplicar", {})
        self.assertEqual(s, 400)


if __name__ == "__main__":
    unittest.main()
