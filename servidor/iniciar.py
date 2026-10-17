"""Supervisor do Oratório no PC: aplica a atualização baixada, sobe o servidor e abre o navegador.

Código de saída 3 do servidor = "baixei uma atualização, me suba de novo". Se a versão
nova não subir (sai com erro em menos de 30 s), a anterior volta sozinha. Veio do clave.

Quem abre a janela é o Electron (electron/main.cjs), que chama este arquivo com --sem-janela. Sem esse
argumento ele abre o Oratório no Brave (ou no navegador padrão), para quem quiser usar numa aba.
--porta, --modo e --dados seguem para o servidor (os testes usam).

Uso: python servidor\\iniciar.py [--sem-janela] [--porta N] [--modo pc|demo] [--dados pasta]
"""
from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atualizador  # noqa: E402
import config  # noqa: E402

PORTA_PADRAO = 8074
LOG = config.RAIZ / "dados" / "supervisor.log"


def log(msg: str) -> None:
    LOG.parent.mkdir(parents=True, exist_ok=True)
    linha = time.strftime("%Y-%m-%d %H:%M:%S ") + msg
    print(linha, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(linha + "\n")


def respondendo(porta: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{porta}/api/saude", timeout=1.5) as r:
            return b"oratorio" in r.read()
    except OSError:
        return False


def porta_livre(porta: int) -> bool:
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", porta))
            return True
        except OSError:
            return False


def abrir_navegador(url: str) -> None:
    candidatos = []
    for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), os.environ.get("LOCALAPPDATA")):
        if base:
            candidatos.append(Path(base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"))
    brave = next((str(c) for c in candidatos if c.is_file()), None)
    if brave:
        subprocess.Popen([brave, url])
    else:
        webbrowser.open(url)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sem-janela", action="store_true", help="não abre o navegador (o Electron e o preview do Claude Code usam assim)")
    ap.add_argument("--porta", type=int, default=PORTA_PADRAO)
    ap.add_argument("--modo", choices=("pc", "demo"), default="pc")
    ap.add_argument("--dados", default="")
    a = ap.parse_args()
    PORTA = a.porta
    para_o_servidor = ["--porta", str(PORTA), "--modo", a.modo] + (["--dados", a.dados] if a.dados else [])
    url = f"http://localhost:{PORTA}/"
    if not porta_livre(PORTA):
        if respondendo(PORTA):
            log("O Oratório já está aberto.")
            if not a.sem_janela:
                abrir_navegador(url)
            return 0
        log(f"A porta {PORTA} está ocupada por outro programa.")
        return 1
    os.environ["ORATORIO_LANCADOR"] = "1"
    aberto = a.sem_janela
    while True:
        acabou_de_atualizar = False
        try:
            r = atualizador.aplicar_pendente()
            if r:
                acabou_de_atualizar = True
                log(f"Atualização para a versão {r['versao']} aplicada.")
        except atualizador.ErroAtualizacao as erro:
            log(f"Atualização não aplicada: {erro}")
        inicio = time.time()
        proc = subprocess.Popen([sys.executable, str(config.RAIZ / "servidor" / "servidor.py"), *para_o_servidor], cwd=str(config.RAIZ))
        if not aberto:
            for _ in range(80):
                if proc.poll() is not None or respondendo(PORTA):
                    break
                time.sleep(0.25)
            if proc.poll() is None:
                abrir_navegador(url)
                aberto = True
        codigo = proc.wait()
        durou = time.time() - inicio
        if codigo == 3:
            log("Reiniciando com a versão nova.")
            continue
        if acabou_de_atualizar and codigo != 0 and durou < 30:
            log("A versão nova não subiu: voltando para a anterior.")
            if atualizador.reverter():
                continue
        return codigo


if __name__ == "__main__":
    sys.exit(main())
