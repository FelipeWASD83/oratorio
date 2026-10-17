"""Onde ficam as coisas e como esta cópia do Oratório roda.

Três modos:
- "pc": o computador de quem usa. Servidor só em 127.0.0.1; o cadeado (se houver)
  é o da pasta vizinha `..\\cadeado`; sincroniza com o servidor de casa, se configurado.
- "servidor": o servidor de casa (mini PC). Escuta na rede de casa, o celular abre
  por ele; a parte trancada pede a senha (hash em dados/senha.json, cookie de sessão)
  e a sincronia pede o token (dados/token.txt).
- "demo": dados numa pasta temporária, IA de mentira, sem sincronia. Para o preview e os testes.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
APP = RAIZ / "app"
CACHE = Path(os.environ.get("ORATORIO_CACHE") or RAIZ / "cache")
LIVROS = json.loads((APP / "dados" / "livros.json").read_text(encoding="utf-8"))["livros"]


def info_versao() -> dict:
    try:
        return json.loads((RAIZ / "versao.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"versao": "0.0.0"}


VERSAO = info_versao().get("versao", "0.0.0")


def ler_env(arquivo: Path) -> dict[str, str]:
    """Lê um .env simples (CHAVE=valor). Só o arquivo: a variável ANTHROPIC_API_KEY do Windows
    não é usada de propósito (o Claude Code tenta usar ela no lugar do plano)."""
    valores = {}
    try:
        texto = arquivo.read_text(encoding="utf-8-sig")
    except OSError:
        return valores
    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        valores[chave.strip()] = valor.strip().strip('"').strip("'")
    return valores


class Config:
    def __init__(self, modo: str = "pc", dados: Path | None = None, porta: int | None = None,
                 cadeado: Path | None | bool = None, ia_falsa: bool = False):
        """cadeado: None = procurar (no PC, a pasta vizinha); False = sem cadeado; um caminho = esse."""
        self.modo = modo
        self.dados = Path(dados) if dados else RAIZ / "dados"
        self.dados.mkdir(parents=True, exist_ok=True)
        self.porta = porta if porta is not None else {"pc": 8074, "demo": 8075, "servidor": 8076}[modo]
        self.host = "0.0.0.0" if modo == "servidor" else "127.0.0.1"
        env = {**ler_env(RAIZ / ".env"), **ler_env(self.dados / ".env")}
        self.env = env
        self.chave_openai = env.get("OPENAI_API_KEY", "")
        self.chave_claude = env.get("ANTHROPIC_API_KEY", "")
        self.ia_falsa = ia_falsa or modo == "demo" or env.get("ORATORIO_IA_FALSA") == "1"
        self.url_openai = env.get("ORATORIO_URL_OPENAI", "https://api.openai.com/v1/responses")
        self.url_claude = env.get("ORATORIO_URL_CLAUDE", "https://api.anthropic.com/v1/messages")
        try:
            self.teto_dia = float(env.get("ORATORIO_TETO_DIA", "2"))
        except ValueError:
            self.teto_dia = 2.0
        # Sincronia (só no PC): endereço do servidor de casa e o token dele.
        self.sincronia_url = env.get("ORATORIO_SINCRONIA_URL", "").rstrip("/") if modo == "pc" else ""
        self.sincronia_token = env.get("ORATORIO_SINCRONIA_TOKEN", "") if modo == "pc" else ""
        if modo == "servidor":
            self.sincronia_token = self._token_do_servidor()
        # Cadeado: no PC, a pasta vizinha (ou ORATORIO_CADEADO); no servidor, o hash da senha.
        if cadeado is False:
            self.cadeado = None
        elif cadeado is not None:
            self.cadeado = Path(cadeado)
        elif modo == "pc":
            caminho = env.get("ORATORIO_CADEADO") or str(RAIZ.parent / "cadeado")
            self.cadeado = Path(caminho) if (Path(caminho) / "trava.py").exists() else None
        else:
            self.cadeado = None
        self.arquivo_senha = self.dados / "senha.json"

    def _token_do_servidor(self) -> str:
        arquivo = self.dados / "token.txt"
        try:
            return arquivo.read_text(encoding="utf-8").strip()
        except OSError:
            return ""

    @property
    def banco(self) -> Path:
        return self.dados / "oratorio.db"
