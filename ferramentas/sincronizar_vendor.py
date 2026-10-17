"""Copia para app/vendor/ os projetos que o Oratório reaproveita, como estão nas pastas vizinhas.

- colinha-de-pecados -> app/vendor/colinha (o index.html troca o main.js pela ponte do Oratório,
  que guarda as marcações no servidor, atrás do cadeado)
- arvore-biblica     -> app/vendor/arvore
- brave-nova-aba/js/vigia/versiculos.js -> app/vendor/vigia/versiculos.js (o versículo do dia do Vigia)

A fonte continua sendo cada projeto: mexeu lá, rode isto de novo. Com --conferir, só diz se a
cópia está desatualizada (sai com 1 se estiver).

Uso: python ferramentas\\sincronizar_vendor.py [--conferir]
"""
from __future__ import annotations

import argparse
import filecmp
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ.parent
VENDOR = RAIZ / "app" / "vendor"

COPIAS = {
    "colinha": (PASTA / "colinha-de-pecados", ["index.html", "favicon.svg", "css", "js", "dados", "vendor"]),
    "arvore": (PASTA / "arvore-biblica", ["index.html", "css", "js", "dados"]),
}
SCRIPT_COLINHA_ORIGINAL = '<script type="module" src="js/main.js"></script>'
SCRIPT_COLINHA_ORATORIO = '<script type="module" src="../../js/colinha-ponte.js"></script>'


def commit(pasta: Path) -> str:
    try:
        return subprocess.run(["git", "-C", str(pasta), "rev-parse", "--short", "HEAD"], capture_output=True,
                              text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def montar(destino: Path) -> dict:
    origem_info = {}
    for nome, (origem, itens) in COPIAS.items():
        if not origem.is_dir():
            sys.exit(f"Não achei {origem}: o Oratório precisa da pasta vizinha para copiar.")
        alvo = destino / nome
        for item in itens:
            fonte = origem / item
            if fonte.is_dir():
                shutil.copytree(fonte, alvo / item, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"))
            elif fonte.exists():
                (alvo / item).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(fonte, alvo / item)
        origem_info[nome] = {"pasta": origem.name, "commit": commit(origem)}
    indice = destino / "colinha" / "index.html"
    texto = indice.read_text(encoding="utf-8")
    if SCRIPT_COLINHA_ORIGINAL not in texto:
        sys.exit("O index.html da colinha mudou: não achei a linha do main.js para trocar pela ponte.")
    indice.write_text(texto.replace(SCRIPT_COLINHA_ORIGINAL, SCRIPT_COLINHA_ORATORIO), encoding="utf-8")
    versiculos = PASTA / "brave-nova-aba" / "js" / "vigia" / "versiculos.js"
    (destino / "vigia").mkdir(parents=True, exist_ok=True)
    shutil.copy2(versiculos, destino / "vigia" / "versiculos.js")
    origem_info["vigia"] = {"pasta": "brave-nova-aba", "commit": commit(PASTA / "brave-nova-aba")}
    return origem_info


def iguais(a: Path, b: Path) -> bool:
    comparacao = filecmp.dircmp(a, b)
    if comparacao.left_only or comparacao.right_only or comparacao.diff_files or comparacao.funny_files:
        return False
    mesmo, diferente, _ = filecmp.cmpfiles(a, b, comparacao.common_files, shallow=False)
    if diferente:
        return False
    return all(iguais(a / d, b / d) for d in comparacao.common_dirs)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--conferir", action="store_true", help="só confere, não copia")
    a = p.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        novo = Path(tmp) / "vendor"
        info = montar(novo)
        if a.conferir:
            atual = all(iguais(novo / n, VENDOR / n) for n in ("colinha", "arvore", "vigia") if (VENDOR / n).exists()) and all((VENDOR / n).exists() for n in ("colinha", "arvore", "vigia"))
            print("Cópias em dia." if atual else "Cópias DESATUALIZADAS: rode python ferramentas\\sincronizar_vendor.py")
            sys.exit(0 if atual else 1)
        for n in ("colinha", "arvore", "vigia"):
            shutil.rmtree(VENDOR / n, ignore_errors=True)
            shutil.copytree(novo / n, VENDOR / n)
    (VENDOR / "ORIGEM.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Copiado:", ", ".join(f"{k} ({v['pasta']} {v['commit']})" for k, v in info.items()))


if __name__ == "__main__":
    main()
