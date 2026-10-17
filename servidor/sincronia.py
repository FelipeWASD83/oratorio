"""Sincronia do PC com o servidor de casa (o celular abre o servidor de casa).

O PC é quem chama: manda o que mudou aqui desde a última vez e recebe o que mudou
lá. Cada lado guarda até onde já viu o outro (o `seq` de cada um). Sem servidor
configurado, nada acontece; servidor fora do ar, tenta de novo depois, sem perder
nada (o que mudou continua marcado pelo `seq`).
"""
from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request

INTERVALO = 60          # segundos entre uma rodada e outra
LOTE = 2000


class Sincronia:
    def __init__(self, config, armazem):
        self.config = config
        self.armazem = armazem
        self._acordar = threading.Event()
        self._parar = threading.Event()
        self._trava = threading.Lock()
        self.ultimo = {"quando": 0, "ok": None, "erro": "", "enviados": 0, "recebidos": 0}

    @property
    def ligada(self) -> bool:
        return bool(self.config.sincronia_url and self.config.sincronia_token)

    def estado(self) -> dict:
        return {"ligada": self.ligada, "url": self.config.sincronia_url, **self.ultimo}

    def avisar(self) -> None:
        """Mudou algo aqui: sincroniza logo (sem esperar o minuto)."""
        self._acordar.set()

    def iniciar(self) -> None:
        if not self.ligada:
            return
        threading.Thread(target=self._laco, name="sincronia", daemon=True).start()

    def parar(self) -> None:
        self._parar.set()
        self._acordar.set()

    def _laco(self) -> None:
        while not self._parar.is_set():
            self.rodar()
            self._acordar.wait(INTERVALO)
            self._acordar.clear()
            time.sleep(1.5)   # junta várias mudanças seguidas numa rodada só

    def rodar(self) -> dict:
        with self._trava:
            enviados = recebidos = 0
            try:
                for _ in range(50):
                    desde = int(self.armazem.meta("sync:enviado", "0") or 0)
                    itens, ate = self.armazem.mudancas_desde(desde, LOTE)
                    visto = int(self.armazem.meta("sync:remoto", "0") or 0)
                    resposta = self._post({"itens": itens, "desde": visto, "limite": LOTE})
                    self.armazem.definir_meta("sync:enviado", str(ate))
                    enviados += len(itens)
                    recebidos += self.armazem.aplicar(resposta.get("itens", []))
                    self.armazem.definir_meta("sync:remoto", str(int(resposta.get("ate", visto))))
                    if len(itens) < LOTE and not resposta.get("mais"):
                        break
                # O que acabou de chegar ganhou seq novo aqui e volta na próxima rodada; o servidor
                # ignora (mesmo `em`). Custa uns bytes e evita perder mudança feita no meio da rodada.
                self.ultimo = {"quando": int(time.time() * 1000), "ok": True, "erro": "",
                               "enviados": enviados, "recebidos": recebidos}
            except (urllib.error.URLError, OSError, ValueError) as erro:
                motivo = erro.reason if isinstance(erro, urllib.error.URLError) else erro
                if isinstance(erro, urllib.error.HTTPError) and erro.code == 401:
                    motivo = "o servidor de casa recusou o token"
                self.ultimo = {"quando": int(time.time() * 1000), "ok": False, "erro": str(motivo),
                               "enviados": enviados, "recebidos": recebidos}
            return self.ultimo

    def _post(self, corpo: dict) -> dict:
        req = urllib.request.Request(self.config.sincronia_url + "/api/sincronia",
                                     data=json.dumps(corpo, ensure_ascii=False).encode("utf-8"), method="POST",
                                     headers={"Content-Type": "application/json",
                                              "Authorization": f"Bearer {self.config.sincronia_token}"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))


def responder(armazem, corpo: dict) -> dict:
    """O lado do servidor de casa: aplica o que veio e devolve o que mudou aqui desde `desde`."""
    itens = corpo.get("itens") if isinstance(corpo.get("itens"), list) else []
    armazem.aplicar(itens[:LOTE])
    desde = int(corpo.get("desde") or 0)
    limite = max(1, min(LOTE, int(corpo.get("limite") or LOTE)))
    saida, ate = armazem.mudancas_desde(desde, limite)
    return {"itens": saida, "ate": ate, "mais": len(saida) >= limite}
