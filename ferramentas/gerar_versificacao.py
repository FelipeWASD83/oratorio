"""Gera app/dados/versificacao.json: quanto somar ao versículo de um Salmo para passar
da numeração das Bíblias protestantes (a da nova aba e do Vigia) para a da Ave-Maria.

A Ave-Maria numera o título do salmo como versículo ("Salmo de Davi." é o v. 1, como
no texto hebraico); a ARA e a NTLH não. A diferença de cada salmo sai da contagem de
versos das duas (só números: nada do texto vai para o arquivo). Precisa do cache
(ferramentas\\baixar_biblia.py com o arvore-biblica ao lado).

Uso: python ferramentas\\gerar_versificacao.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def salmo_am(h: int) -> int | None:
    if h <= 8:
        return h
    if h in (9, 10, 114, 115, 116, 147):
        return None   # salmos que se juntam ou se partem: sem deslocamento simples
    if h <= 113 or h <= 146:
        return h - 1
    return h


def main() -> None:
    try:
        am = json.loads((RAIZ / "cache" / "biblias" / "AM.json").read_text(encoding="utf-8"))["livros"]["PSA"]
        ara = json.loads((RAIZ / "cache" / "biblias" / "ARA.json").read_text(encoding="utf-8"))["livros"]["PSA"]
    except OSError:
        sys.exit("Falta o cache da Ave-Maria ou da ARA: rode ferramentas\\baixar_biblia.py com o arvore-biblica ao lado.")
    deslocamentos = {}
    for h in range(1, 151):
        g = salmo_am(h)
        if g is None:
            continue
        d = len(am[g - 1]) - len(ara[h - 1])
        if d > 0:
            deslocamentos[str(h)] = d
    destino = RAIZ / "app" / "dados" / "versificacao.json"
    destino.write_text(json.dumps({"_leia": __doc__.strip().splitlines()[0], "salmos": deslocamentos}, ensure_ascii=False, indent=1),
                       encoding="utf-8")
    print(f"{len(deslocamentos)} salmos com deslocamento -> {destino}")


if __name__ == "__main__":
    main()
