"""Baixa o Catecismo da Igreja Católica (texto em português do vatican.va) para o cache.

O texto é da Libreria Editrice Vaticana: fica só em `cache/catecismo.json`, fora
do git e das releases, para uso pessoal. É ele que a IA usa como base principal
e que a página mostra quando alguém clica num §.

Saída:
    {"fonte": "...", "paragrafos": {"1": {"t": "texto", "s": ["título", "subtítulo"]}, ...}}

Uso: python ferramentas\\baixar_catecismo.py [--forcar]
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "cache" / "catecismo.json"
PASTA_HTML = RAIZ / "cache" / "catecismo-html"
BASE = "https://www.vatican.va/archive/cathechism_po/index_new/"
PAGINAS = [
    "prologo%201-25_po.html", "p1s1c1_26-49_po.html", "p1s1c2_50-141_po.html", "p1s1c3_142-184_po.html",
    "p1s2_185-197_po.html", "p1s2c1_198-421_po.html", "p1s2cap2_422-682_po.html", "p1s2cap3_683-1065_po.html",
    "p2s1cap1_1066-1075_po.html", "p2s1cap1_1076-1134_po.html", "p2s1cap2_1135-1209_po.html",
    "p2s2cap1_1210-1419_po.html", "p2s2cap1_1420-1532_po.html", "p2s2cap3_1533-1666_po.html",
    "p2s2cap4_1667-1690_po.html", "p3-intr_1691-1698_po.html", "p3s1cap1_1699-1876_po.html",
    "p3s1cap2_1877-1948_po.html", "p3s1cap3_1949-2051_po.html", "p3s2-intr_2052-2082_po.html",
    "p3s2cap1_2083-2195_po.html", "p3s2cap2_2196-2557_po.html", "p4-intr_2558-2565_po.html",
    "p4s1cap1_2566-2649_po.html", "p4s1cap2_2650-2696_po.html", "p4s1cap3_2697-2758_po.html",
    "p4s2_2759-2865_po.html",
]
PARTES = {"prologo": "Prólogo", "p1": "Primeira parte: a profissão da fé", "p2": "Segunda parte: a celebração do mistério cristão",
          "p3": "Terceira parte: a vida em Cristo", "p4": "Quarta parte: a oração cristã"}
TOTAL = 2865
NUMERO = re.compile(r"^\s*(\d{1,4})\s*(\.?)\s+")
NOTA = re.compile(r"\s?\((\d{1,3})\)")


class Blocos(HTMLParser):
    """Transforma a página numa lista de blocos de texto: (tipo, texto), tipo 'p' ou 'solto'."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocos: list[tuple[str, str]] = []
        self.atual: list[str] = []
        self.dentro_p = 0
        self.ignorar = 0

    def fechar(self, tipo: str):
        texto = re.sub(r"\s+", " ", "".join(self.atual)).strip()
        if texto:
            self.blocos.append((tipo, texto))
        self.atual = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "head"):
            self.ignorar += 1
        elif tag in ("p", "blockquote", "table", "tr", "td", "div", "br", "h1", "h2", "h3", "h4"):
            if tag == "br":
                self.atual.append(" ")
                return
            self.fechar("p" if self.dentro_p else "solto")
            if tag == "p":
                self.dentro_p += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "head"):
            self.ignorar = max(0, self.ignorar - 1)
        elif tag in ("p", "blockquote", "table", "tr", "td", "div", "h1", "h2", "h3", "h4"):
            self.fechar("p" if self.dentro_p else "solto")
            if tag == "p":
                self.dentro_p = max(0, self.dentro_p - 1)

    def handle_data(self, data):
        if not self.ignorar:
            self.atual.append(data)


def baixar(nome: str, forcar: bool) -> str:
    PASTA_HTML.mkdir(parents=True, exist_ok=True)
    local = PASTA_HTML / nome.replace("%20", "_")
    if local.exists() and not forcar:
        return local.read_bytes().decode("latin-1")
    print(f"  baixando {nome}")
    req = urllib.request.Request(BASE + nome, headers={"User-Agent": "oratorio (uso pessoal)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        bruto = r.read()
    local.write_bytes(bruto)
    time.sleep(0.5)
    return bruto.decode("latin-1")


def eh_titulo(texto: str) -> bool:
    if len(texto) > 140 or NUMERO.match(texto):
        return False
    letras = [c for c in texto if c.isalpha()]
    if not letras:
        return False
    maiusculas = sum(1 for c in letras if c.isupper()) / len(letras)
    return maiusculas > 0.6 or bool(re.match(r"^(ARTIGO|CAP[IÍ]TULO|SEC[CÇ][AÃ]O|PARTE|[IVX]+\.)\b", texto))


def bonito(titulo: str) -> str:
    """'O SEXTO MANDAMENTO' -> 'O sexto mandamento' (deixa como está o que já vem misturado)."""
    letras = [c for c in titulo if c.isalpha()]
    if letras and sum(1 for c in letras if c.isupper()) / len(letras) > 0.6:
        titulo = titulo.capitalize()
    return titulo.strip(" .")


def processar(nome: str, texto_html: str, paragrafos: dict) -> None:
    parte = PARTES["prologo"] if nome.startswith("prologo") else PARTES[nome[:2]]
    leitor = Blocos()
    leitor.feed(texto_html)
    leitor.fechar("solto")
    titulos: list[str] = []
    atual = None
    ultimo = max((int(k) for k in paragrafos), default=0)
    for tipo, texto in leitor.blocos:
        texto = html.unescape(texto)
        m = NUMERO.match(texto)
        # Com ponto ("2000.") vale qualquer número; sem ponto ("755 ") só o próximo esperado,
        # para não confundir com citação que começa com número ("1 Cor 13").
        if m and 1 <= int(m.group(1)) <= TOTAL and (m.group(2) or 0 < int(m.group(1)) - ultimo <= 3):
            n = int(m.group(1))
            ultimo = max(ultimo, n)
            corpo = NOTA.sub("", texto[m.end():]).strip()
            atual = {"t": corpo, "s": [parte] + titulos[-2:]}
            if str(n) not in paragrafos:
                paragrafos[str(n)] = atual
            else:
                atual = None
            continue
        if eh_titulo(texto):
            t = bonito(texto)
            if titulos and re.fullmatch(r"(Artigo|Capítulo|Secção|Seção) \d+|Artigo \d+", titulos[-1]):
                titulos[-1] = f"{titulos[-1]}: {t}"
            else:
                titulos.append(t)
            titulos = titulos[-4:]
            atual = None
            continue
        if atual is not None and tipo == "p" and len(texto) > 1:
            # citação em bloco ou continuação do mesmo §
            atual["t"] += "\n" + NOTA.sub("", texto).strip()


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--forcar", action="store_true", help="baixa de novo mesmo que já exista")
    a = p.parse_args()
    if DESTINO.exists() and not a.forcar:
        print(f"O Catecismo já está em {DESTINO} (use --forcar para baixar de novo).")
        return
    print("Baixando o Catecismo do vatican.va...")
    paragrafos: dict = {}
    for nome in PAGINAS:
        processar(nome, baixar(nome, a.forcar), paragrafos)
    faltam = [n for n in range(1, TOTAL + 1) if str(n) not in paragrafos]
    corpo = {"fonte": BASE + "prima-pagina-cic_po.html",
             "aviso": "Texto da Libreria Editrice Vaticana, para uso pessoal. Não versionar nem publicar.",
             "faltam": faltam, "paragrafos": dict(sorted(paragrafos.items(), key=lambda kv: int(kv[0])))}
    DESTINO.write_text(json.dumps(corpo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(paragrafos)} parágrafos -> {DESTINO}")
    if faltam:
        print(f"Atenção: {len(faltam)} § não apareceram: {faltam[:30]}")
        if len(faltam) > 50:
            sys.exit(1)


if __name__ == "__main__":
    main()
