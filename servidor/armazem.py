"""Os dados de quem usa, num SQLite, prontos para sincronizar entre aparelhos.

Tudo é guardado como itens soltos: (coleção, id) -> valor JSON, com o momento da
última mudança (`em`, ms) e um número de sequência local (`seq`) que só cresce.
Apagar não remove a linha: marca `apagado`, para a sincronia levar a remoção.

A sincronia é "a última mudança vence", item por item: dois aparelhos que mexem
em coisas diferentes (um marca Gênesis 1, o outro escreve uma oração) nunca
perdem nada; os dois mexendo no mesmo item, fica o mais recente.
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path

# Coleções que só aparecem com o cadeado aberto (decisão do Felipe em 17/10/2026:
# a parte do Vigia e os dados salvos da colinha; as perguntas à IA vão junto,
# porque dizem o que a pessoa fez).
TRANCADAS = {"vigia", "colinha", "perguntas"}
COLECOES = {"lidos", "marcadores", "oracoes", "intencoes", "config", "terco"} | TRANCADAS
MAX_VALOR = 200_000


def agora_ms() -> int:
    return int(time.time() * 1000)


class Armazem:
    def __init__(self, arquivo: Path):
        self.arquivo = Path(arquivo)
        self.arquivo.parent.mkdir(parents=True, exist_ok=True)
        self._trava = threading.Lock()
        self._con = sqlite3.connect(str(self.arquivo), check_same_thread=False)
        self._con.execute("PRAGMA journal_mode=WAL")
        self._con.execute("""CREATE TABLE IF NOT EXISTS itens (
            colecao TEXT NOT NULL, id TEXT NOT NULL, valor TEXT, em INTEGER NOT NULL,
            apagado INTEGER NOT NULL DEFAULT 0, seq INTEGER NOT NULL,
            PRIMARY KEY (colecao, id))""")
        self._con.execute("CREATE INDEX IF NOT EXISTS itens_seq ON itens(seq)")
        self._con.execute("CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT)")
        self._con.commit()

    # ── leitura ────────────────────────────────────────────────

    def listar(self, colecao: str, com_apagados: bool = False) -> dict[str, dict]:
        with self._trava:
            linhas = self._con.execute(
                "SELECT id, valor, em, apagado FROM itens WHERE colecao=?", (colecao,)).fetchall()
        saida = {}
        for id_, valor, em, apagado in linhas:
            if apagado and not com_apagados:
                continue
            saida[id_] = {"valor": json.loads(valor) if valor else None, "em": em, "apagado": bool(apagado)}
        return saida

    def valores(self, colecao: str) -> dict:
        return {k: v["valor"] for k, v in self.listar(colecao).items()}

    def ler(self, colecao: str, id_: str, padrao=None):
        with self._trava:
            linha = self._con.execute("SELECT valor, apagado FROM itens WHERE colecao=? AND id=?",
                                      (colecao, id_)).fetchone()
        if not linha or linha[1]:
            return padrao
        return json.loads(linha[0]) if linha[0] else padrao

    # ── escrita ────────────────────────────────────────────────

    def _proximo_seq(self) -> int:
        linha = self._con.execute("SELECT MAX(seq) FROM itens").fetchone()
        return (linha[0] or 0) + 1

    def gravar(self, colecao: str, id_: str, valor, em: int | None = None) -> int:
        """Grava agora (ou no momento `em`). Devolve o `em` gravado."""
        conferir(colecao, id_)
        texto = json.dumps(valor, ensure_ascii=False, separators=(",", ":"))
        if len(texto) > MAX_VALOR:
            raise ValueError("Valor grande demais.")
        with self._trava:
            atual = self._con.execute("SELECT em FROM itens WHERE colecao=? AND id=?", (colecao, id_)).fetchone()
            em = em or agora_ms()
            if atual and atual[0] >= em:
                em = atual[0] + 1   # relógio igual ou atrasado: a mudança local ainda vence
            self._con.execute("INSERT OR REPLACE INTO itens (colecao, id, valor, em, apagado, seq) VALUES (?,?,?,?,0,?)",
                              (colecao, id_, texto, em, self._proximo_seq()))
            self._con.commit()
        return em

    def apagar(self, colecao: str, id_: str) -> None:
        conferir(colecao, id_)
        with self._trava:
            atual = self._con.execute("SELECT em FROM itens WHERE colecao=? AND id=?", (colecao, id_)).fetchone()
            em = max(agora_ms(), (atual[0] + 1) if atual else 0)
            self._con.execute("INSERT OR REPLACE INTO itens (colecao, id, valor, em, apagado, seq) VALUES (?,?,NULL,?,1,?)",
                              (colecao, id_, em, self._proximo_seq()))
            self._con.commit()

    # ── sincronia ──────────────────────────────────────────────

    def mudancas_desde(self, seq: int, limite: int = 2000) -> tuple[list[dict], int]:
        """Itens mudados depois de `seq` (inclusive trancados: a sincronia é só entre aparelhos do dono, com token)."""
        with self._trava:
            linhas = self._con.execute(
                "SELECT colecao, id, valor, em, apagado, seq FROM itens WHERE seq>? ORDER BY seq LIMIT ?",
                (seq, limite)).fetchall()
            maior = self._con.execute("SELECT MAX(seq) FROM itens").fetchone()[0] or 0
        itens = [{"c": c, "id": i, "v": json.loads(v) if v else None, "em": em, "x": bool(a)} for c, i, v, em, a, _ in linhas]
        ate = linhas[-1][5] if linhas else maior
        return itens, ate

    def aplicar(self, itens: list[dict]) -> int:
        """Recebe itens de outro aparelho; fica o mais recente. Devolve quantos mudaram aqui."""
        mudou = 0
        with self._trava:
            for item in itens:
                try:
                    colecao, id_, em = str(item["c"]), str(item["id"]), int(item["em"])
                    conferir(colecao, id_)
                except (KeyError, TypeError, ValueError):
                    continue
                atual = self._con.execute("SELECT em FROM itens WHERE colecao=? AND id=?", (colecao, id_)).fetchone()
                if atual and atual[0] >= em:
                    continue
                apagado = 1 if item.get("x") else 0
                valor = None if apagado else json.dumps(item.get("v"), ensure_ascii=False, separators=(",", ":"))
                if valor and len(valor) > MAX_VALOR:
                    continue
                self._con.execute("INSERT OR REPLACE INTO itens (colecao, id, valor, em, apagado, seq) VALUES (?,?,?,?,?,?)",
                                  (colecao, id_, valor, em, apagado, self._proximo_seq()))
                mudou += 1
            self._con.commit()
        return mudou

    def meta(self, chave: str, padrao: str = "") -> str:
        with self._trava:
            linha = self._con.execute("SELECT valor FROM meta WHERE chave=?", (chave,)).fetchone()
        return linha[0] if linha else padrao

    def definir_meta(self, chave: str, valor: str) -> None:
        with self._trava:
            self._con.execute("INSERT OR REPLACE INTO meta (chave, valor) VALUES (?,?)", (chave, valor))
            self._con.commit()

    def fechar(self) -> None:
        with self._trava:
            self._con.close()


def conferir(colecao: str, id_: str) -> None:
    if colecao not in COLECOES:
        raise ValueError(f"Coleção desconhecida: {colecao}")
    if not isinstance(id_, str) or not id_ or len(id_) > 200:
        raise ValueError("Id inválido.")
