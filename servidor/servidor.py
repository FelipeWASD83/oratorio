"""O servidor do Oratório: entrega a página e a API (Bíblia, Catecismo, dados, IA, cadeado, sincronia).

Só biblioteca padrão do Python.

Uso:
    python servidor/servidor.py                 # PC (127.0.0.1:8074)
    python servidor/servidor.py --modo demo     # preview e testes: dados temporários, IA de mentira (:8075)
    python servidor/servidor.py --modo servidor # servidor de casa, na rede (:8076)
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import tempfile
import threading
import time
import urllib.parse
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import armazem as armazem_mod  # noqa: E402
import atualizador  # noqa: E402
import config as config_mod  # noqa: E402
import ia as ia_mod  # noqa: E402
import portao as portao_mod  # noqa: E402
import sincronia as sincronia_mod  # noqa: E402
import textos  # noqa: E402

MAX_CORPO = 1_000_000
# A extensão da nova aba (ID fixo pela "key" do manifesto dela) é a única origem de fora que pode falar com /api/ponte/.
EXTENSAO_ORIGEM = "chrome-extension://cidbkemhlibfkhcikiaiiiadoomaginl"
REF_CAPITULO = re.compile(r"^[1-3]?[A-Z]{2,3}\.\d{1,3}$")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/manifest+json", ".webmanifest")

CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
       "font-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'")
# A Árvore da Bíblia (copiada em app/vendor/arvore) usa as fontes do Google, como no projeto dela.
CSP_ARVORE = (CSP.replace("style-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
              .replace("font-src 'self'", "font-src 'self' https://fonts.gstatic.com"))


class App:
    """Tudo que o servidor precisa, montado uma vez."""

    def __init__(self, config):
        self.config = config
        self.armazem = armazem_mod.Armazem(config.banco)
        self.portao = portao_mod.Portao(config)
        self.ia = ia_mod.Ia(config, self.armazem)
        self.biblias = textos.Biblias(config_mod.CACHE / "biblias", config_mod.LIVROS)
        self.catecismo = textos.Catecismo(config_mod.CACHE / "catecismo.json")
        self.sincronia = sincronia_mod.Sincronia(config, self.armazem)
        self.codigo_de_saida = 0
        self.servidor: ThreadingHTTPServer | None = None

    def ponte_estado(self) -> dict:
        """A última vez que a extensão da nova aba sincronizou (o Vigia e o plano da Bíblia)."""
        try:
            quando = int(self.armazem.meta("ponte:quando", "0") or 0)
            resumo = json.loads(self.armazem.meta("ponte:resumo", "{}") or "{}")
        except ValueError:
            quando, resumo = 0, {}
        return {"quando": quando, **resumo}


ROTAS: list[tuple[str, re.Pattern, str]] = []


def rota(metodo: str, padrao: str):
    def registrar(f):
        ROTAS.append((metodo, re.compile("^" + padrao + "$"), f.__name__))
        return f
    return registrar


class Erro(Exception):
    def __init__(self, status: int, mensagem: str):
        super().__init__(mensagem)
        self.status = status


class Pedido(BaseHTTPRequestHandler):
    server_version = "Oratorio"
    protocol_version = "HTTP/1.1"

    @property
    def app(self) -> App:
        return self.server.app

    def log_message(self, formato, *args):
        if os.environ.get("ORATORIO_LOG") == "1":
            super().log_message(formato, *args)

    # ── utilidades ─────────────────────────────────────────────

    def _cookie(self) -> str | None:
        bruto = self.headers.get("Cookie")
        if not bruto:
            return None
        c = SimpleCookie()
        try:
            c.load(bruto)
        except Exception:
            return None
        m = c.get(portao_mod.COOKIE)
        return m.value if m else None

    def _aberto(self) -> bool:
        return self.app.portao.aberto(self._cookie())

    def _corpo(self) -> dict:
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho > MAX_CORPO:
            raise Erro(413, "Corpo grande demais.")
        if not tamanho:
            return {}
        try:
            dados = json.loads(self.rfile.read(tamanho).decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as erro:
            raise Erro(400, "JSON inválido.") from erro
        if not isinstance(dados, dict):
            raise Erro(400, "JSON inválido.")
        return dados

    def _enviar(self, status: int, corpo: bytes, tipo: str, extra: dict | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(corpo)

    def _json(self, dados, status: int = 200, extra: dict | None = None) -> None:
        self._enviar(status, json.dumps(dados, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", extra)

    def _host_valido(self) -> bool:
        """No PC, só 127.0.0.1/localhost (contra DNS rebinding). Pedido que muda algo precisa vir da mesma origem."""
        host = (self.headers.get("Host") or "").lower()
        if self.app.config.modo != "servidor":
            nome = host.rsplit(":", 1)[0]
            if nome not in ("127.0.0.1", "localhost", "[::1]"):
                return False
        if self.command in ("POST", "PUT", "DELETE"):
            origem = self.headers.get("Origin")
            if origem and urllib.parse.urlparse(origem).netloc.lower() != host:
                if self.path.startswith("/api/ponte/"):
                    return origem.lower() == EXTENSAO_ORIGEM and self.app.config.modo != "servidor"
                return self.path.startswith("/api/sincronia")   # a sincronia vem de outro aparelho, com token
        return True

    # ── despacho ───────────────────────────────────────────────

    def _despachar(self) -> None:
        if not self._host_valido():
            self._json({"erro": "Endereço não permitido."}, 403)
            return
        url = urllib.parse.urlparse(self.path)
        caminho = urllib.parse.unquote(url.path)
        self.query = {k: v[0] for k, v in urllib.parse.parse_qs(url.query).items()}
        if not caminho.startswith("/api/"):
            if self.command in ("GET", "HEAD"):
                self._estatico(caminho)
            else:
                self._json({"erro": "Método não permitido."}, 405)
            return
        metodo = "GET" if self.command == "HEAD" else self.command
        for m, padrao, nome in ROTAS:
            if m != metodo:
                continue
            achou = padrao.match(caminho)
            if achou:
                try:
                    getattr(self, nome)(*achou.groups())
                except Erro as erro:
                    self._json({"erro": str(erro)}, erro.status)
                except ia_mod.ErroDaIa as erro:
                    self._json({"erro": str(erro)}, 502)
                except ValueError as erro:
                    self._json({"erro": str(erro)}, 400)
                except (BrokenPipeError, ConnectionResetError):
                    pass
                return
        self._json({"erro": "Não encontrado."}, 404)

    do_GET = do_HEAD = do_POST = do_PUT = do_DELETE = lambda self: self._despachar()

    def _estatico(self, caminho: str) -> None:
        if caminho in ("", "/"):
            caminho = "/index.html"
        alvo = (config_mod.APP / caminho.lstrip("/")).resolve()
        if not alvo.is_relative_to(config_mod.APP.resolve()) or not alvo.is_file():
            self._enviar(404, "Não encontrado.".encode("utf-8"), "text/plain; charset=utf-8")
            return
        tipo = mimetypes.guess_type(alvo.name)[0] or "application/octet-stream"
        if tipo.startswith("text/") or tipo in ("application/json", "text/javascript"):
            tipo += "; charset=utf-8"
        politica = CSP_ARVORE if caminho.startswith("/vendor/arvore/") else CSP
        extra = {"Content-Security-Policy": politica} if alvo.suffix == ".html" else None
        self._enviar(200, alvo.read_bytes(), tipo, extra)

    # ── estado geral ───────────────────────────────────────────

    @rota("GET", "/api/saude")
    def saude(self):
        self._json({"ok": True, "app": "oratorio", "versao": config_mod.VERSAO})

    @rota("GET", "/api/estado")
    def estado(self):
        a = self.app
        self._json({
            "versao": config_mod.VERSAO, "modo": a.config.modo,
            "portao": a.portao.estado(self._cookie()),
            "ia": a.ia.estado(), "sincronia": a.sincronia.estado(), "ponte": a.ponte_estado(),
            "biblias": a.biblias.disponiveis(), "catecismo": a.catecismo.disponivel(),
            "repositorio": config_mod.info_versao().get("repositorio", ""),
        })

    # ── Bíblia ─────────────────────────────────────────────────

    @rota("GET", r"/api/biblia/([A-Z0-9]{2,8})/([1-3]?[A-Z]{2,3})/(\d{1,3})")
    def biblia_capitulo(self, sigla, livro, cap):
        versos = self.app.biblias.capitulo(sigla, livro, int(cap))
        if versos is None:
            raise Erro(404, "Capítulo não encontrado nesta tradução.")
        self._json({"sigla": sigla, "livro": livro, "cap": int(cap), "versos": versos,
                    "capitulos": self.app.biblias.capitulos(sigla, livro)})

    @rota("GET", r"/api/biblia/([A-Z0-9]{2,8})/busca")
    def biblia_busca(self, sigla):
        q = (self.query.get("q") or "").strip()[:200]
        self._json(self.app.biblias.buscar(sigla, q))

    @rota("GET", r"/api/biblia/([A-Z0-9]{2,8})/versos")
    def biblia_versos(self, sigla):
        saida = {}
        for ref in (self.query.get("refs") or "").split(",")[:80]:
            m = ia_mod.REF_BIBLIA.match(ref.strip().upper())
            if not m:
                continue
            livro, cap, de = m.group(1), int(m.group(2)), int(m.group(3))
            ate = int(m.group(4) or de)
            saida[ref.strip()] = [{"v": n, "texto": t} for n, t in self.app.biblias.versos(sigla, livro, cap, de, min(ate, de + 30))]
        self._json({"sigla": sigla, "versos": saida})

    # ── Catecismo ──────────────────────────────────────────────

    @rota("GET", r"/api/catecismo/(\d{1,4})")
    def catecismo_paragrafo(self, n):
        p = self.app.catecismo.paragrafo(int(n))
        if not p:
            raise Erro(404, "Parágrafo não encontrado." if self.app.catecismo.disponivel() else "O Catecismo ainda não foi baixado.")
        vizinhos = self.app.catecismo.intervalo(max(1, int(n) - 2), int(n) + 2)
        self._json({**p, "vizinhos": vizinhos})

    @rota("GET", "/api/catecismo/busca")
    def catecismo_busca(self):
        q = (self.query.get("q") or "").strip()[:200]
        self._json({"resultados": self.app.catecismo.buscar(q, 30) if q else []})

    @rota("GET", "/api/catecismo/trecho")
    def catecismo_trecho(self):
        de, ate = int(self.query.get("de") or 1), int(self.query.get("ate") or 1)
        if ate - de > 120:
            raise Erro(400, "Intervalo grande demais.")
        self._json({"paragrafos": self.app.catecismo.intervalo(de, ate)})

    # ── dados de quem usa ──────────────────────────────────────

    def _conferir_colecao(self, colecao: str) -> None:
        if colecao not in armazem_mod.COLECOES:
            raise Erro(404, "Coleção desconhecida.")
        if colecao in armazem_mod.TRANCADAS and not self._aberto():
            raise Erro(423, "Trancado: digite a senha do cadeado.")

    @rota("GET", r"/api/dados/([a-z]+)")
    def dados_listar(self, colecao):
        self._conferir_colecao(colecao)
        self._json({"itens": self.app.armazem.valores(colecao)})

    @rota("PUT", r"/api/dados/([a-z]+)/([^/]{1,200})")
    def dados_gravar(self, colecao, id_):
        self._conferir_colecao(colecao)
        corpo = self._corpo()
        em = self.app.armazem.gravar(colecao, id_, corpo.get("valor"))
        self.app.sincronia.avisar()
        self._json({"ok": True, "em": em})

    @rota("DELETE", r"/api/dados/([a-z]+)/([^/]{1,200})")
    def dados_apagar(self, colecao, id_):
        self._conferir_colecao(colecao)
        self.app.armazem.apagar(colecao, id_)
        self.app.sincronia.avisar()
        self._json({"ok": True})

    @rota("POST", r"/api/dados/([a-z]+)/lote")
    def dados_lote(self, colecao):
        """{"itens": {id: valor ou null}}: grava vários de uma vez (null apaga)."""
        self._conferir_colecao(colecao)
        itens = self._corpo().get("itens") or {}
        if not isinstance(itens, dict) or len(itens) > 3000:
            raise Erro(400, "Lote inválido.")
        for id_, valor in itens.items():
            if valor is None:
                self.app.armazem.apagar(colecao, str(id_))
            else:
                self.app.armazem.gravar(colecao, str(id_), valor)
        self.app.sincronia.avisar()
        self._json({"ok": True, "quantos": len(itens)})

    # ── cadeado ────────────────────────────────────────────────

    @rota("GET", "/api/portao")
    def portao_estado(self):
        self._json(self.app.portao.estado(self._cookie()))

    @rota("POST", "/api/portao/destravar")
    def portao_destravar(self):
        senha = str(self._corpo().get("senha") or "")[:200]
        r = self.app.portao.destravar(senha, self.client_address[0])
        extra = None
        if r.get("cookie"):
            seguro = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
            extra = {"Set-Cookie": f"{portao_mod.COOKIE}={r['cookie']}; Max-Age={portao_mod.SESSAO_SEGUNDOS}; Path=/; HttpOnly; SameSite=Strict{seguro}"}
        self._json({"ok": r.get("ok", False), "erro": r.get("erro", ""), "espera": r.get("espera", 0)},
                   200 if r.get("ok") else 403, extra)

    @rota("POST", "/api/portao/trancar")
    def portao_trancar(self):
        self.app.portao.trancar()
        self._json({"ok": True}, extra={"Set-Cookie": f"{portao_mod.COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict"})

    # ── IA ─────────────────────────────────────────────────────

    @rota("GET", "/api/ia")
    def ia_estado(self):
        self._json(self.app.ia.estado())

    @rota("PUT", "/api/ia")
    def ia_ajustar(self):
        corpo = self._corpo()
        atual = self.app.ia.ajustes()
        for campo in ("modelo", "reserva", "esforco"):
            if campo in corpo:
                atual[campo] = str(corpo[campo])[:100]
        self.app.armazem.gravar("config", "ia", atual)
        self.app.sincronia.avisar()
        self._json(self.app.ia.estado())

    @rota("POST", "/api/ia/perguntar")
    def ia_perguntar(self):
        corpo = self._corpo()
        r = self.app.ia.perguntar(str(corpo.get("pergunta") or ""), self.app.catecismo, self.app.biblias)
        r["salva"] = False
        if self._aberto():
            id_ = time.strftime("%Y%m%d%H%M%S") + "-" + os.urandom(3).hex()
            self.app.armazem.gravar("perguntas", id_, {**r, "quando": int(time.time() * 1000)})
            self.app.sincronia.avisar()
            r["salva"], r["id"] = True, id_
        self._json(r)

    @rota("POST", "/api/ia/revisar")
    def ia_revisar(self):
        corpo = self._corpo()
        self._json(self.app.ia.revisar(str(corpo.get("titulo") or "")[:200], str(corpo.get("texto") or ""), self.app.catecismo))

    # ── sincronia ──────────────────────────────────────────────

    @rota("POST", "/api/sincronia")
    def sincronia_receber(self):
        token = self.app.config.sincronia_token
        if self.app.config.modo != "servidor" or not token:
            raise Erro(404, "Este aparelho não recebe sincronia.")
        if (self.headers.get("Authorization") or "") != f"Bearer {token}":
            raise Erro(401, "Token errado.")
        self._json(sincronia_mod.responder(self.app.armazem, self._corpo()))

    @rota("GET", "/api/sincronia/estado")
    def sincronia_estado(self):
        self._json(self.app.sincronia.estado())

    @rota("POST", "/api/sincronia/agora")
    def sincronia_agora(self):
        if not self.app.sincronia.ligada:
            raise Erro(400, "A sincronia não está configurada neste aparelho.")
        self._json(self.app.sincronia.rodar())

    # ── a extensão da nova aba (Vigia e plano da Bíblia), em segundo plano ──

    def _so_no_pc(self) -> None:
        if self.app.config.modo == "servidor":
            raise Erro(404, "Este aparelho não conversa com a extensão.")

    @rota("GET", "/api/ponte/estado")
    def ponte_estado(self):
        """O que a extensão precisa saber: capítulos lidos, o que ela já tinha visto e o que está esperando para ir ao Vigia."""
        self._so_no_pc()
        a = self.app.armazem
        pendentes = [{"k": k, "tipo": v.get("tipo"), "em": v.get("em")} for k, v in a.valores("vigia").items()
                     if k.startswith("pendente:") and isinstance(v, dict) and not v.get("aplicado")]
        visto = a.ler("config", "novaAbaVisto")
        self._json({"lidos": sorted(a.valores("lidos")), "visto": visto.get("refs") if isinstance(visto, dict) else None,
                    "pendentes": pendentes})

    @rota("POST", "/api/ponte/aplicar")
    def ponte_aplicar(self):
        """A extensão devolve o que juntou: capítulos a marcar e desmarcar, o retrato do Vigia e o que já entregou ao Vigia.
        Grava direto no armazém: o cadeado vale para quem lê pela página, não para a extensão, que só escreve o retrato."""
        self._so_no_pc()
        corpo = self._corpo()
        a = self.app.armazem

        def refs(nome: str) -> list[str]:
            lista = corpo.get(nome)
            if not isinstance(lista, list) or len(lista) > 2000:
                raise Erro(400, f"{nome} inválido.")
            if any(not isinstance(r, str) or not REF_CAPITULO.match(r) for r in lista):
                raise Erro(400, f"{nome} tem capítulo inválido.")
            return lista

        marcar, desmarcar, visto = refs("marcar"), refs("desmarcar"), refs("visto")
        for r in marcar:
            a.gravar("lidos", r, {"l": 1})
        for r in desmarcar:
            a.apagar("lidos", r)
        a.gravar("config", "novaAbaVisto", {"refs": visto, "quando": int(time.time() * 1000)})
        retrato = corpo.get("retrato")
        if isinstance(retrato, dict):
            limpo = {k: int(retrato.get(k) or 0) for k in ("inicio", "recorde", "vencidas", "tentativasHoje", "lidoEm")}
            limpo["recaidas"] = [{"em": int(x.get("em") or 0), "durou": int(x.get("durou") or 0)}
                                 for x in (retrato.get("recaidas") or [])[-30:] if isinstance(x, dict)]
            limpo["origem"] = "nova-aba"
            a.gravar("vigia", "retrato", limpo)
        for k in (corpo.get("aplicados") or [])[:200]:
            atual = a.ler("vigia", str(k))
            if str(k).startswith("pendente:") and isinstance(atual, dict):
                a.gravar("vigia", str(k), {**atual, "aplicado": int(time.time() * 1000)})
        a.definir_meta("ponte:quando", str(int(time.time() * 1000)))
        a.definir_meta("ponte:resumo", json.dumps({"trouxe": len(marcar), "tirou": len(desmarcar), "entregues": len(corpo.get("aplicados") or [])}))
        self.app.sincronia.avisar()
        self._json({"ok": True})

    # ── atualização ────────────────────────────────────────────

    @rota("GET", "/api/atualizacao")
    def atualizacao(self):
        if self.app.config.modo == "servidor":
            self._json({"atual": config_mod.VERSAO, "servidor": True})
            return
        self._json(atualizador.checar(forcar=self.query.get("forcar") == "1"))

    @rota("POST", "/api/atualizacao/aplicar")
    def atualizacao_aplicar(self):
        if self.app.config.modo == "servidor":
            raise Erro(400, "O servidor de casa se atualiza pelo implantar\\enviar.ps1 do PC.")
        try:
            r = atualizador.baixar_e_preparar()
        except atualizador.ErroAtualizacao as erro:
            raise Erro(400, str(erro)) from erro
        self._json({"ok": True, **r, "reiniciando": os.environ.get("ORATORIO_LANCADOR") == "1"})
        if os.environ.get("ORATORIO_LANCADOR") == "1":
            self.app.codigo_de_saida = 3
            threading.Timer(0.8, self.app.servidor.shutdown).start()


class Servidor(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        # quem pediu fechou a conexão antes da resposta (aba fechada, celular que saiu do wi-fi): não é erro
        if isinstance(sys.exc_info()[1], ConnectionError):
            return
        super().handle_error(request, client_address)


def criar(config) -> tuple[ThreadingHTTPServer, App]:
    app = App(config)
    servidor = Servidor((config.host, config.porta), Pedido)
    servidor.daemon_threads = True
    servidor.app = app
    app.servidor = servidor
    return servidor, app


def main() -> int:
    p = argparse.ArgumentParser(description="Servidor do Oratório")
    p.add_argument("--modo", choices=("pc", "demo", "servidor"), default="pc")
    p.add_argument("--porta", type=int)
    p.add_argument("--dados", help="pasta dos dados (padrão: dados/, ou uma temporária no modo demo)")
    p.add_argument("--sem-cadeado", action="store_true", help="ignora o cadeado (teste)")
    a = p.parse_args()
    dados = Path(a.dados) if a.dados else (Path(tempfile.gettempdir()) / "oratorio-demo" if a.modo == "demo" else None)
    config = config_mod.Config(a.modo, dados=dados, porta=a.porta, cadeado=False if a.sem_cadeado else None)
    servidor, app = criar(config)
    app.sincronia.iniciar()
    print(f"Oratório {config_mod.VERSAO} ({config.modo}) em http://{'127.0.0.1' if config.host == '127.0.0.1' else config.host}:{config.porta}"
          f" · cadeado: {app.portao.tipo} · sincronia: {'ligada' if app.sincronia.ligada else 'desligada'}", flush=True)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        app.sincronia.parar()
        servidor.server_close()
        app.armazem.fechar()
    return app.codigo_de_saida


if __name__ == "__main__":
    sys.exit(main())
