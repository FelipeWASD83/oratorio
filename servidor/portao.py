"""O cadeado da parte trancada (Vigia, dados da colinha, perguntas à IA).

Três jeitos, conforme onde roda:
- PC com a pasta `cadeado` ao lado: usa a trava de lá (`trava.py`). Destravar aqui
  destrava em todos os lugares do PC, e ela tranca sozinha com 15 min parado.
- Servidor de casa: a mesma senha, conferida contra o hash em dados/senha.json (o
  mesmo formato do cadeado e do P.AI do mini PC), e um cookie assinado de 400 dias.
- Sem nada disso: nada fica trancado (quem baixa o app de fora não tem cadeado).

Ninguém guarda a senha: só o hash (PBKDF2-SHA256).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import importlib.util
import json
import secrets
import threading
import time
from pathlib import Path

COOKIE = "oratorio_sessao"
SESSAO_SEGUNDOS = 400 * 24 * 3600
ERROS_ANTES_DE_ESPERAR = 5
ESPERA_DEPOIS_DE_ERRAR = 30


def normalizar(senha: str) -> str:
    """Igual ao cadeado: com ou sem traço, espaço ou quebra de linha, vale a mesma senha."""
    return "".join(c for c in (senha or "") if c not in " -\t\r\n")


class Portao:
    def __init__(self, config):
        self.config = config
        self._trava = None
        self._erros: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        if config.cadeado:
            spec = importlib.util.spec_from_file_location("trava_do_cadeado", Path(config.cadeado) / "trava.py")
            modulo = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(modulo)
            self._trava = modulo
        self._segredo = self._carregar_segredo()

    # ── qual é o tipo ──────────────────────────────────────────

    @property
    def tipo(self) -> str:
        if self._trava is not None:
            return "cadeado"
        if self._hash() is not None:
            return "senha"
        return "nenhum"

    def _hash(self) -> dict | None:
        try:
            bruto = json.loads(Path(self.config.arquivo_senha).read_text(encoding="utf-8"))
            return {"sal": bytes.fromhex(bruto["sal"]), "iteracoes": int(bruto["iteracoes"]), "hash": str(bruto["hash"]).lower()}
        except (OSError, ValueError, KeyError, TypeError):
            return None

    def _carregar_segredo(self) -> bytes:
        arquivo = Path(self.config.dados) / "sessao.key"
        try:
            dado = arquivo.read_bytes()
            if len(dado) >= 32:
                return dado
        except OSError:
            pass
        dado = secrets.token_bytes(32)
        arquivo.write_bytes(dado)
        return dado

    # ── está aberto? ───────────────────────────────────────────

    def aberto(self, cookie: str | None) -> bool:
        tipo = self.tipo
        if tipo == "nenhum":
            return True
        if tipo == "cadeado":
            try:
                return bool(self._trava.manter())   # o mesmo que a ponte da nova aba chama: renova com o último uso do PC
            except Exception:
                return False
        return self._sessao_valida(cookie)

    def estado(self, cookie: str | None) -> dict:
        return {"tipo": self.tipo, "aberto": self.aberto(cookie), "espera": self._espera(cookie or "")}

    # ── destravar ──────────────────────────────────────────────

    def _espera(self, quem: str) -> int:
        if self.tipo == "cadeado":
            try:
                return int(self._trava.espera_por_erros())
            except Exception:
                return 0
        with self._lock:
            erros = [t for t in self._erros.get(quem, []) if time.time() - t < ESPERA_DEPOIS_DE_ERRAR]
            self._erros[quem] = erros
            if len(erros) >= ERROS_ANTES_DE_ESPERAR:
                return int(ESPERA_DEPOIS_DE_ERRAR - (time.time() - erros[-1])) + 1
        return 0

    def destravar(self, senha: str, quem: str) -> dict:
        """{"ok": bool, "cookie": str|None, "espera": s, "erro": str}"""
        tipo = self.tipo
        if tipo == "nenhum":
            return {"ok": True, "cookie": None}
        if tipo == "cadeado":
            try:
                r = self._trava.destrancar(senha)
            except Exception as erro:
                return {"ok": False, "erro": f"O cadeado não respondeu ({erro})."}
            if isinstance(r, dict):
                return {"ok": bool(r.get("ok", r.get("aberto"))), "espera": int(r.get("espera") or 0),
                        "erro": "" if r.get("ok", r.get("aberto")) else (r.get("erro") or "Senha errada.")}
            return {"ok": bool(r), "erro": "" if r else "Senha errada."}
        espera = self._espera(quem)
        if espera:
            return {"ok": False, "espera": espera, "erro": f"Muitas tentativas. Espere {espera} s."}
        cfg = self._hash()
        derivado = hashlib.pbkdf2_hmac("sha256", normalizar(senha).encode("utf-8"), cfg["sal"], cfg["iteracoes"]).hex()
        if not senha or not hmac.compare_digest(derivado, cfg["hash"]):
            with self._lock:
                self._erros.setdefault(quem, []).append(time.time())
            time.sleep(0.4)
            return {"ok": False, "erro": "Senha errada.", "espera": self._espera(quem)}
        with self._lock:
            self._erros.pop(quem, None)
        return {"ok": True, "cookie": self._emitir()}

    def trancar(self) -> None:
        if self.tipo == "cadeado":
            try:
                self._trava.trancar()
            except Exception:
                pass

    # ── cookie (servidor de casa) ──────────────────────────────

    def _assinar(self, corpo: str) -> str:
        cfg = self._hash() or {"hash": ""}
        chave = self._segredo + cfg["hash"].encode()   # trocar a senha derruba as sessões antigas
        return base64.urlsafe_b64encode(hmac.new(chave, corpo.encode(), hashlib.sha256).digest()).decode().rstrip("=")

    def _emitir(self) -> str:
        corpo = f"{int(time.time()) + SESSAO_SEGUNDOS}.{secrets.token_hex(8)}"
        return f"{corpo}.{self._assinar(corpo)}"

    def _sessao_valida(self, cookie: str | None) -> bool:
        if not cookie or cookie.count(".") != 2:
            return False
        validade, aleatorio, assinatura = cookie.split(".")
        if not hmac.compare_digest(assinatura, self._assinar(f"{validade}.{aleatorio}")):
            return False
        try:
            return int(validade) > time.time()
        except ValueError:
            return False
