"""Baixa a Bíblia Ave-Maria e prepara as outras traduções que já estão no PC.

O texto das Bíblias tem direito autoral: fica só em `cache/biblias/`, fora do
git e fora das releases, para uso pessoal. Este script é o único lugar que
sabe de onde ele vem.

- Ave-Maria (73 livros, a padrão): JSON do repositório fidalgobr/bibliaAveMariaJSON.
- NTLH, ARA, ARC, NAA, NVI (66 livros): do cache do projeto arvore-biblica, se
  existir na pasta vizinha (`..\\arvore-biblica\\ferramentas\\cache\\biblias`).

Formato de saída (um arquivo por tradução):
    {"sigla": "AM", "nome": "...", "livros": {"GEN": [["v1", "v2"], ["v1"]], ...}}
O verso N do capítulo C fica em livros[COD][C-1][N-1]; verso que falta vira "".

Uso: python ferramentas\\baixar_biblia.py [--forcar]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / "cache" / "biblias"
LIVROS = json.loads((RAIZ / "app" / "dados" / "livros.json").read_text(encoding="utf-8"))["livros"]
URL_AVE_MARIA = "https://raw.githubusercontent.com/fidalgobr/bibliaAveMariaJSON/main/bibliaAveMaria.json"
ARVORE = RAIZ.parent / "arvore-biblica" / "ferramentas" / "cache" / "biblias"
# Onde as traduções protestantes dividem os capítulos de outro jeito que a Ave-Maria.
PROTESTANTE = {"EST": 10, "DAN": 12, "JOL": 3, "MAL": 4}
OUTRAS = {
    "NTLH": "Nova Tradução na Linguagem de Hoje",
    "ARA": "Almeida Revista e Atualizada",
    "ARC": "Almeida Revista e Corrigida",
    "NAA": "Nova Almeida Atualizada",
    "NVI": "Nova Versão Internacional",
}


def limpar(texto: str) -> str:
    """Tira as marcas de nota de rodapé (*) e espaço sobrando."""
    texto = re.sub(r"\s*\*+\s*", " ", str(texto or ""))
    return re.sub(r"\s+", " ", texto).strip()


def montar_capitulo(versos: list[tuple[int, str]]) -> list[str]:
    if not versos:
        return []
    maior = max(n for n, _ in versos)
    saida = [""] * maior
    for n, t in versos:
        if 1 <= n <= maior:
            saida[n - 1] = (saida[n - 1] + " " + t).strip() if saida[n - 1] and saida[n - 1] != t else t
    return saida


def ave_maria(forcar: bool) -> Path:
    destino = CACHE / "AM.json"
    if destino.exists() and not forcar:
        print(f"Ave-Maria já está em {destino}")
        return destino
    print("Baixando a Ave-Maria...")
    with urllib.request.urlopen(urllib.request.Request(URL_AVE_MARIA, headers={"User-Agent": "oratorio"}), timeout=120) as r:
        bruto = json.loads(r.read().decode("utf-8"))
    por_nome = {}
    for testamento in ("antigoTestamento", "novoTestamento"):
        for livro in bruto[testamento]:
            por_nome[livro["nome"]] = livro
    livros = {}
    for codigo, _nome, _abrev, _test, capitulos, nome_am in LIVROS:
        fonte = por_nome.get(nome_am)
        if fonte is None:
            sys.exit(f"A Ave-Maria baixada não tem o livro '{nome_am}'. O arquivo de origem mudou?")
        caps = []
        for cap in sorted(fonte["capitulos"], key=lambda c: c["capitulo"]):
            caps.append(montar_capitulo([(int(v["versiculo"]), limpar(v["texto"])) for v in cap["versiculos"]]))
        if len(caps) != capitulos:
            sys.exit(f"{codigo}: a Ave-Maria tem {len(caps)} capítulos, o livros.json diz {capitulos}.")
        livros[codigo] = caps
    gravar(destino, "AM", "Ave-Maria", URL_AVE_MARIA, livros)
    return destino


def outra(sigla: str, nome: str, forcar: bool) -> Path | None:
    pasta = ARVORE / sigla
    destino = CACHE / f"{sigla}.json"
    if not pasta.is_dir():
        return None
    if destino.exists() and not forcar:
        print(f"{sigla} já está em {destino}")
        return destino
    esperado = {c: n for c, _, _, _, n, _ in LIVROS}
    livros = {}
    for arquivo in sorted(pasta.glob("*.json")):
        codigo = arquivo.stem
        if codigo not in esperado:
            continue
        dados = json.loads(arquivo.read_text(encoding="utf-8"))
        caps = []
        for cap in sorted(dados["chapters"], key=lambda c: c["number"]):
            caps.append((int(cap["number"]), [(int(v["number"]), limpar(v["text"])) for v in cap["verses"]]))
        # O arquivo de origem da NTLH parte 2 Samuel 23 em pedaços que viram "capítulos" 25 a 38
        # (conferido em 05/10/2026 na brave-nova-aba). Capítulo além da conta normal: os versos
        # entram no último capítulo que tem aquele número de verso faltando, sem repetir texto.
        limite = PROTESTANTE.get(codigo, esperado[codigo])
        normais = [v for n, v in caps if n <= limite]
        sobras = [v for n, v in caps if n > limite]
        montados = [montar_capitulo(v) for v in normais]
        for pedaco in sobras:
            for n, t in pedaco:
                alvo = next((c for c in reversed(montados) if len(c) >= n - 1), None)
                if alvo is None or t in alvo:
                    continue
                while len(alvo) < n:
                    alvo.append("")
                alvo[n - 1] = alvo[n - 1] or t
        livros[codigo] = montados
    gravar(destino, sigla, nome, f"cache do arvore-biblica ({pasta})", livros)
    return destino


def gravar(destino: Path, sigla: str, nome: str, fonte: str, livros: dict) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    corpo = {"sigla": sigla, "nome": nome, "fonte": fonte,
             "aviso": "Texto com direito autoral, para uso pessoal. Não versionar nem publicar.", "livros": livros}
    destino.write_text(json.dumps(corpo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    versos = sum(len(c) for caps in livros.values() for c in caps)
    print(f"{sigla}: {len(livros)} livros, {versos} versos -> {destino}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--forcar", action="store_true", help="baixa e gera de novo mesmo que já exista")
    a = p.parse_args()
    ave_maria(a.forcar)
    achou = [s for s, n in OUTRAS.items() if outra(s, n, a.forcar)]
    if not achou:
        print("Sem o cache do arvore-biblica ao lado: só a Ave-Maria fica disponível (é a padrão).")


if __name__ == "__main__":
    main()
