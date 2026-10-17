"""A Bíblia e o Catecismo do cache: ler um capítulo, um §, e buscar.

Os dois textos têm direito autoral e moram só em `cache/` (baixados pelos
scripts de `ferramentas/`). Sem eles, a página funciona e avisa o que falta.
"""
from __future__ import annotations

import json
import math
import re
import threading
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

PALAVRAS_VAZIAS = set("""
a à ao aos as às até com como da das de dela dele deles do dos e é ela elas ele eles em entre era essa esse esta
este eu foi há isso isto já la lhe lhes mais mas me mesmo meu minha muito na nas nem no nos nós num numa o os ou
para pela pelas pelo pelos por qual quando que quem se sem ser seu seus si só sua suas também te tem tu um uma umas
uns vos vós sobre seja são sao ter pode posso fazer faz fiz isso coisa algo eh pq porque
""".split())


def sem_acento(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn").lower()


def palavras(texto: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", sem_acento(texto))


def raiz(p: str) -> str:
    """Radical bem simples para português: o bastante para 'pecados' achar 'pecado' e 'mentir' achar 'mentira'."""
    for fim in ("amentos", "imentos", "amento", "imento", "acoes", "icoes", "acao", "icao", "mente", "idades", "idade",
                "ismos", "ismo", "istas", "ista", "ivas", "ivos", "iva", "ivo", "osas", "osos", "osa", "oso",
                "ares", "eres", "ires", "ando", "endo", "indo", "aram", "eram", "iram", "ados", "idos", "adas", "idas",
                "ado", "ido", "ada", "ida", "ar", "er", "ir", "as", "es", "os", "a", "e", "o", "s"):
        if p.endswith(fim) and len(p) - len(fim) >= 4:
            return p[: -len(fim)]
    return p


def termos(texto: str) -> list[str]:
    return [raiz(p) for p in palavras(texto) if p not in PALAVRAS_VAZIAS and len(p) > 1]


class Biblias:
    def __init__(self, pasta: Path, livros: list[list]):
        self.pasta = Path(pasta)
        self.livros = {l[0]: l for l in livros}
        self._cache: dict[str, dict] = {}
        self._trava = threading.Lock()

    def disponiveis(self) -> list[dict]:
        saida = []
        for arquivo in sorted(self.pasta.glob("*.json")):
            try:
                with arquivo.open(encoding="utf-8") as f:
                    cabeca = f.read(400)
                nome = re.search(r'"nome":"([^"]*)"', cabeca)
                saida.append({"sigla": arquivo.stem, "nome": nome.group(1) if nome else arquivo.stem})
            except OSError:
                continue
        saida.sort(key=lambda b: (b["sigla"] != "AM", b["sigla"]))
        return saida

    def _carregar(self, sigla: str) -> dict | None:
        if not re.fullmatch(r"[A-Z0-9]{2,8}", sigla or ""):
            return None
        with self._trava:
            if sigla not in self._cache:
                arquivo = self.pasta / f"{sigla}.json"
                if not arquivo.exists():
                    return None
                self._cache[sigla] = json.loads(arquivo.read_text(encoding="utf-8"))
            return self._cache[sigla]

    def capitulo(self, sigla: str, livro: str, cap: int) -> list[str] | None:
        b = self._carregar(sigla)
        if not b:
            return None
        caps = b["livros"].get(livro)
        if not caps or not 1 <= cap <= len(caps):
            return None
        return caps[cap - 1]

    def capitulos(self, sigla: str, livro: str) -> int:
        b = self._carregar(sigla)
        return len(b["livros"].get(livro) or []) if b else 0

    def versos(self, sigla: str, livro: str, cap: int, de: int, ate: int) -> list[tuple[int, str]]:
        c = self.capitulo(sigla, livro, cap) or []
        return [(n, c[n - 1]) for n in range(max(1, de), min(ate, len(c)) + 1) if c[n - 1]]

    def buscar(self, sigla: str, consulta: str, limite: int = 200) -> dict:
        b = self._carregar(sigla)
        if not b:
            return {"resultados": [], "total": 0}
        buscadas = [p for p in palavras(consulta) if len(p) > 1]
        if not buscadas:
            return {"resultados": [], "total": 0}
        frase = sem_acento(consulta).strip().strip('"')
        resultados, total = [], 0
        for codigo in self.livros:
            for i, cap in enumerate(b["livros"].get(codigo) or []):
                for j, verso in enumerate(cap):
                    if not verso:
                        continue
                    alvo = sem_acento(verso)
                    if all(p in alvo for p in buscadas):
                        total += 1
                        if len(resultados) < limite:
                            resultados.append({"livro": codigo, "cap": i + 1, "v": j + 1, "texto": verso,
                                               "exato": frase in alvo})
        resultados.sort(key=lambda r: not r["exato"])
        return {"resultados": resultados, "total": total}


class Catecismo:
    """O CIC com busca BM25 (título da seção conta junto, com peso menor)."""

    def __init__(self, arquivo: Path):
        self.arquivo = Path(arquivo)
        self.paragrafos: dict[int, dict] = {}
        self._indice: dict[str, list[tuple[int, int]]] = {}
        self._tamanhos: dict[int, int] = {}
        self._media = 1.0
        self._carregado = False
        self._trava = threading.Lock()

    def disponivel(self) -> bool:
        return self.arquivo.exists()

    def _carregar(self) -> None:
        with self._trava:
            if self._carregado or not self.arquivo.exists():
                return
            bruto = json.loads(self.arquivo.read_text(encoding="utf-8"))
            self.paragrafos = {int(k): v for k, v in bruto["paragrafos"].items()}
            postagens: dict[str, list[tuple[int, int]]] = defaultdict(list)
            for n, p in self.paragrafos.items():
                contagem = Counter(termos(p["t"]))
                for t in termos(" ".join(p.get("s", [])[1:])):
                    contagem[t] += 1
                self._tamanhos[n] = sum(contagem.values()) or 1
                for t, f in contagem.items():
                    postagens[t].append((n, f))
            self._indice = dict(postagens)
            self._media = sum(self._tamanhos.values()) / max(1, len(self._tamanhos))
            self._carregado = True

    def paragrafo(self, n: int) -> dict | None:
        self._carregar()
        p = self.paragrafos.get(int(n))
        return {"n": int(n), "texto": p["t"], "secao": p.get("s", [])} if p else None

    def intervalo(self, de: int, ate: int) -> list[dict]:
        self._carregar()
        return [self.paragrafo(n) for n in range(de, ate + 1) if n in self.paragrafos]

    def buscar(self, consulta: str, limite: int = 12) -> list[dict]:
        self._carregar()
        if not self._carregado:
            return []
        if re.fullmatch(r"\s*(§|cic)?\s*\d{1,4}\s*", consulta, re.I):
            p = self.paragrafo(int(re.search(r"\d+", consulta).group()))
            return [p] if p else []
        k1, b = 1.4, 0.75
        n_docs = len(self.paragrafos)
        pontos: Counter = Counter()
        for t in set(termos(consulta)):
            lista = self._indice.get(t)
            if not lista:
                continue
            idf = math.log(1 + (n_docs - len(lista) + 0.5) / (len(lista) + 0.5))
            for n, f in lista:
                pontos[n] += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * self._tamanhos[n] / self._media))
        return [{**self.paragrafo(n), "pontos": round(v, 3)} for n, v in pontos.most_common(limite)]
