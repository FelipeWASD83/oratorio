"""O armazenamento e a sincronia entre dois aparelhos (a última mudança vence, item por item)."""
import tempfile
import unittest
from pathlib import Path

import armazem as A
import sincronia as S


class TestArmazem(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.a = A.Armazem(Path(self.tmp.name) / "a.db")
        self.b = A.Armazem(Path(self.tmp.name) / "b.db")

    def tearDown(self):
        self.a.fechar()
        self.b.fechar()
        self.tmp.cleanup()

    def test_gravar_ler_apagar(self):
        self.a.gravar("oracoes", "x", {"titulo": "Pela mãe"})
        self.assertEqual(self.a.ler("oracoes", "x"), {"titulo": "Pela mãe"})
        self.a.apagar("oracoes", "x")
        self.assertIsNone(self.a.ler("oracoes", "x"))
        self.assertTrue(self.a.listar("oracoes", com_apagados=True)["x"]["apagado"])

    def test_colecao_e_id_invalidos(self):
        with self.assertRaises(ValueError):
            self.a.gravar("inventada", "x", 1)
        with self.assertRaises(ValueError):
            self.a.gravar("lidos", "", 1)

    def test_mudanca_local_vence_relogio_atrasado(self):
        self.a.gravar("config", "k", 1, em=5000)
        em = self.a.gravar("config", "k", 2, em=4000)
        self.assertGreater(em, 5000)
        self.assertEqual(self.a.ler("config", "k"), 2)

    def sincronizar(self):
        """a é o PC; b é o servidor de casa."""
        desde = int(self.a.meta("sync:enviado", "0") or 0)
        itens, ate = self.a.mudancas_desde(desde)
        r = S.responder(self.b, {"itens": itens, "desde": int(self.a.meta("sync:remoto", "0") or 0)})
        self.a.definir_meta("sync:enviado", str(ate))
        self.a.aplicar(r["itens"])
        self.a.definir_meta("sync:remoto", str(r["ate"]))

    def test_sincronia_nos_dois_sentidos(self):
        self.a.gravar("lidos", "GEN.1", {"l": 1})
        self.b.gravar("oracoes", "o1", {"titulo": "do celular"})
        self.sincronizar()
        self.assertEqual(self.b.ler("lidos", "GEN.1"), {"l": 1})
        self.assertEqual(self.a.ler("oracoes", "o1"), {"titulo": "do celular"})

    def test_apagar_tambem_sincroniza(self):
        self.a.gravar("lidos", "GEN.1", {"l": 1})
        self.sincronizar()
        self.b.apagar("lidos", "GEN.1")
        self.sincronizar()
        self.assertIsNone(self.a.ler("lidos", "GEN.1"))

    def test_a_ultima_mudanca_vence(self):
        self.a.gravar("config", "plano", {"ritmo": 2}, em=1000)
        self.sincronizar()
        self.b.gravar("config", "plano", {"ritmo": 5}, em=3000)
        self.a.gravar("config", "plano", {"ritmo": 3}, em=2000)
        self.sincronizar()
        self.assertEqual(self.a.ler("config", "plano"), {"ritmo": 5})
        self.assertEqual(self.b.ler("config", "plano"), {"ritmo": 5})

    def test_eco_nao_cria_mudanca_infinita(self):
        self.b.gravar("lidos", "GEN.2", {"l": 1})
        self.sincronizar()
        self.sincronizar()
        seq_b = self.b.mudancas_desde(0)[1]
        self.sincronizar()
        self.assertEqual(self.b.mudancas_desde(0)[1], seq_b)

    def test_trancadas_tambem_vao(self):
        self.a.gravar("vigia", "retrato", {"inicio": 1})
        self.sincronizar()
        self.assertEqual(self.b.ler("vigia", "retrato"), {"inicio": 1})


if __name__ == "__main__":
    unittest.main()
