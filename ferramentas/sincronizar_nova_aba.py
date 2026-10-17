"""Copia app/js/plano.js (a conversão de numeração e a junção do plano) para a extensão da nova aba.

A extensão sincroniza o plano da Bíblia e o Vigia com o Oratório em segundo plano (js/oratorio/ponte.js lá) e
precisa das mesmas contas que a página usa. A fonte é este arquivo; a cópia é idêntica, byte a byte, e o
testar-oratorio.js da nova aba confere. Mexeu no plano.js, rode isto e commite nos dois projetos.

Uso: python ferramentas\\sincronizar_nova_aba.py [--conferir]
"""
from __future__ import annotations

import filecmp
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "app" / "js" / "plano.js"
DESTINO = RAIZ.parent / "brave-nova-aba" / "js" / "oratorio" / "plano-oratorio.js"


def main() -> None:
    if not DESTINO.parent.is_dir():
        sys.exit(f"Não achei {DESTINO.parent}: a pasta brave-nova-aba precisa estar ao lado.")
    if "--conferir" in sys.argv:
        igual = DESTINO.is_file() and filecmp.cmp(ORIGEM, DESTINO, shallow=False)
        print("Cópia em dia." if igual else "Cópia DESATUALIZADA: rode python ferramentas\\sincronizar_nova_aba.py")
        sys.exit(0 if igual else 1)
    shutil.copyfile(ORIGEM, DESTINO)
    print("Copiado para", DESTINO)


if __name__ == "__main__":
    main()
