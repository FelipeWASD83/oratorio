"""A IA do Oratório: "isso é pecado?" e o revisor de orações.

Base principal: o Catecismo da Igreja Católica (o texto do cache). Base secundária:
a Bíblia. Toda citação que volta da IA é conferida aqui contra o texto de verdade:
§ que não existe é marcado, e o que existe aparece com o texto real, para a pessoa
poder ler e julgar sozinha.

GPT e Claude, com reserva por falta de crédito (o esquema dos projetos do Felipe):
o id do modelo decide o lado; quando o crédito de um lado acaba, o mesmo pedido vai
para a reserva do outro lado. HTTP puro com urllib (os SDKs puxam pacote nativo que o
Smart App Control pode barrar). A chamada (`chamar`) veio do tradutor-ln.
"""
from __future__ import annotations

import json
import re
import socket
import threading
import time
from datetime import date
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import provedor
from provedor import eh_claude, provedor_de, reserva_de

MODELO_PADRAO = "claude-sonnet-5-5"
RESERVA_PADRAO = "gpt-6-luna"
ESFORCO_PADRAO = "medium"
ESFORCOS = ("low", "medium", "high")
MAX_SAIDA = 8000
NOME_DE_MODELO = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,99}")
REF_BIBLIA = re.compile(r"^([1-3]?[A-Z]{2,3})\.(\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$")

# Os parágrafos sobre o pecado que entram em toda pergunta (conferidos no texto do cache em 17/10/2026):
# 1849-1851 definição, 1854-1864 mortal e venial, 1868 cooperação no pecado dos outros.
BASE_PECADO = [1849, 1850, 1854, 1855, 1856, 1857, 1858, 1859, 1860, 1861, 1862, 1863, 1864]
# Para o revisor de orações: o que é a oração e as formas dela (2559-2565, 2626-2643).
BASE_ORACAO = [2559, 2560, 2562, 2564, 2565, 2626, 2629, 2631, 2634, 2638, 2639]

DISJUNTOR = provedor.Disjuntor()
_trava_disjuntor = threading.Lock()


class ErroDaIa(RuntimeError):
    pass


class ErroSemCredito(ErroDaIa):
    def __init__(self, mensagem: str, lado: str):
        super().__init__(mensagem)
        self.lado = lado


_LADO = {"openai": "A OpenAI", "claude": "O Claude"}


def _sem_a_chave(texto: str, chave: str) -> str:
    if chave and len(chave) >= 8:
        texto = texto.replace(chave, "[chave]")
    return re.sub(r"\bsk-[A-Za-z0-9_*\-]{6,}", "[chave]", texto)


def chamar(pedido: Request, chave: str, lado: str) -> dict:
    """Uma chamada, sem reenviar quando há chance de cobrança em dobro (só reenvia se nada saiu ou no 429)."""
    for tentativa in range(4):
        try:
            with urlopen(pedido, timeout=180) as resposta:
                return json.loads(resposta.read().decode("utf-8"))
        except HTTPError as erro:
            bruto = erro.read().decode("utf-8", "replace")
            try:
                dados = json.loads(bruto)
            except ValueError:
                dados = {}
            detalhe = dados.get("error", {}).get("message") if isinstance(dados.get("error"), dict) else bruto
            detalhe = _sem_a_chave(str(detalhe or bruto)[:400], chave)
            if provedor.falta_de_credito(erro.code, dados):
                raise ErroSemCredito(f"{_LADO[lado]} ficou sem crédito ({detalhe}). Nada foi cobrado.", lado) from erro
            if erro.code == 429 and tentativa < 3:
                time.sleep(min(20, 2 + tentativa * 3))
                continue
            if erro.code == 401:
                raise ErroDaIa(f"{_LADO[lado]} recusou a chave (HTTP 401). Confira a chave no .env.") from erro
            raise ErroDaIa(f"{_LADO[lado]} respondeu HTTP {erro.code}: {detalhe}") from erro
        except (URLError, OSError, HTTPException) as erro:
            razao = erro.reason if isinstance(erro, URLError) else erro
            nada_saiu = isinstance(razao, (ConnectionRefusedError, socket.gaierror))
            if nada_saiu and tentativa < 2:
                time.sleep(1 + tentativa)
                continue
            raise ErroDaIa(f"Sem conexão com {_LADO[lado].split()[1]} ({razao}).") from erro
    raise ErroDaIa(f"{_LADO[lado]} continuou limitando os pedidos (HTTP 429). Tente daqui a pouco.")


class Ia:
    def __init__(self, config, armazem):
        self.config = config
        self.armazem = armazem

    # ── escolha do modelo ──────────────────────────────────────

    def ajustes(self) -> dict:
        a = self.armazem.ler("config", "ia", {}) or {}
        modelo = a.get("modelo") if NOME_DE_MODELO.fullmatch(str(a.get("modelo") or "")) else MODELO_PADRAO
        reserva = a.get("reserva") if a.get("reserva") in ("auto", "nenhuma") or NOME_DE_MODELO.fullmatch(str(a.get("reserva") or "")) else RESERVA_PADRAO
        esforco = a.get("esforco") if a.get("esforco") in ESFORCOS else ESFORCO_PADRAO
        return {"modelo": modelo, "reserva": reserva, "esforco": esforco}

    def estado(self) -> dict:
        a = self.ajustes()
        return {**a, "tem_openai": bool(self.config.chave_openai), "tem_claude": bool(self.config.chave_claude),
                "falsa": self.config.ia_falsa, "gasto_hoje": round(self.gasto_hoje(), 4), "teto_dia": self.config.teto_dia,
                "pronta": self.config.ia_falsa or bool(self.config.chave_openai or self.config.chave_claude)}

    def _ordem(self, modelo: str, reserva: str) -> list[str]:
        res = reserva_de(re.sub(r"-\d{8}$", "", modelo.lower()) if eh_claude(modelo) else modelo, reserva)
        tem = {"openai": bool(self.config.chave_openai), "claude": bool(self.config.chave_claude)}
        ordem = [m for m in (modelo, res) if m and tem[provedor_de(m)]]
        with _trava_disjuntor:
            if len(ordem) == 2 and DISJUNTOR.aberto(provedor_de(ordem[0])) and not DISJUNTOR.aberto(provedor_de(ordem[1])):
                ordem.reverse()
        return ordem

    # ── gasto ──────────────────────────────────────────────────

    def gasto_hoje(self) -> float:
        try:
            return float(self.armazem.meta("gasto:" + date.today().isoformat(), "0"))
        except ValueError:
            return 0.0

    def _somar_gasto(self, valor: float) -> None:
        chave = "gasto:" + date.today().isoformat()
        self.armazem.definir_meta(chave, str(self.gasto_hoje() + max(0.0, valor)))

    # ── pedido com saída em JSON ───────────────────────────────

    def _pedido(self, modelo: str, esforco: str, instrucoes: str, entrada: str, nome: str, esquema: dict) -> tuple[Request, str, str]:
        if eh_claude(modelo):
            sistema, mensagens = provedor.converter_entrada(instrucoes, entrada)
            for m in mensagens:
                for bloco in m["content"]:
                    bloco.pop("cache_control", None)
            corpo = provedor.corpo_claude(modelo, sistema, mensagens, esforco, MAX_SAIDA, esquema=esquema)
            chave = self.config.chave_claude
            pedido = Request(self.config.url_claude, data=json.dumps(corpo, ensure_ascii=False).encode("utf-8"), method="POST",
                             headers={"x-api-key": chave, "anthropic-version": provedor.ANTHROPIC_VERSAO,
                                      "Content-Type": "application/json"})
            return pedido, chave, "claude"
        corpo = {"model": modelo, "reasoning": {"effort": esforco}, "instructions": instrucoes,
                 "input": [{"role": "user", "content": entrada}],
                 "text": {"format": {"type": "json_schema", "name": nome, "strict": True, "schema": esquema}},
                 "max_output_tokens": MAX_SAIDA, "store": False}
        chave = self.config.chave_openai
        pedido = Request(self.config.url_openai, data=json.dumps(corpo, ensure_ascii=False).encode("utf-8"), method="POST",
                         headers={"Authorization": f"Bearer {chave}", "Content-Type": "application/json"})
        return pedido, chave, "openai"

    def _texto(self, modelo: str, resposta: dict) -> str:
        if eh_claude(modelo):
            lida = provedor.ler_resposta_claude(resposta)
            if lida.parada == "refusal":
                raise ErroDaIa("O modelo se recusou a responder essa pergunta.")
            if lida.parada in ("max_tokens", "model_context_window_exceeded"):
                raise ErroDaIa("A resposta foi cortada no meio. Tente de novo com uma pergunta mais curta.")
            return lida.texto
        if resposta.get("status") in ("failed", "incomplete"):
            raise ErroDaIa("A OpenAI não terminou a resposta. Tente de novo.")
        texto = ""
        for item in resposta.get("output", []):
            if item.get("type") == "message":
                for parte in item.get("content", []):
                    if parte.get("type") == "output_text":
                        texto += parte.get("text", "")
                    elif parte.get("type") == "refusal" and not texto:
                        raise ErroDaIa("O modelo se recusou a responder essa pergunta.")
        return texto

    def pedir_json(self, instrucoes: str, entrada: str, nome: str, esquema: dict, esforco: str | None = None) -> tuple[dict, dict]:
        """(dados, uso). `uso` diz quem respondeu, se foi a reserva e quanto custou."""
        a = self.ajustes()
        if self.gasto_hoje() >= self.config.teto_dia:
            raise ErroDaIa(f"O teto de gasto de hoje (US$ {self.config.teto_dia:.2f}) foi atingido. Amanhã libera de novo; "
                           "o teto muda em ORATORIO_TETO_DIA no .env.")
        ordem = self._ordem(a["modelo"], a["reserva"])
        if not ordem:
            raise ErroDaIa("Sem chave de IA: ponha OPENAI_API_KEY ou ANTHROPIC_API_KEY no arquivo .env do Oratório.")
        falhas = []
        for modelo in ordem:
            pedido, chave, lado = self._pedido(modelo, esforco or a["esforco"], instrucoes, entrada, nome, esquema)
            try:
                resposta = chamar(pedido, chave, lado)
            except ErroSemCredito as erro:
                with _trava_disjuntor:
                    DISJUNTOR.abrir(lado)
                falhas.append(str(erro))
                continue
            with _trava_disjuntor:
                DISJUNTOR.fechar(lado)
            uso_bruto = provedor.uso_normalizado(resposta.get("usage")) if eh_claude(modelo) else resposta.get("usage")
            valor = provedor.custo(modelo, uso_bruto or {}) or 0.0
            self._somar_gasto(valor)
            texto = self._texto(modelo, resposta)
            try:
                dados = json.loads(texto)
            except ValueError as erro:
                raise ErroDaIa("A resposta não veio no formato combinado. Tente de novo.") from erro
            return dados, {"modelo": modelo, "reserva": modelo != a["modelo"], "usd": round(valor, 5)}
        raise ErroDaIa(" ".join(falhas) or "Nenhum modelo respondeu.")

    # ── "isso é pecado?" ───────────────────────────────────────

    def perguntar(self, pergunta: str, catecismo, biblias) -> dict:
        pergunta = (pergunta or "").strip()
        if not pergunta:
            raise ErroDaIa("Escreva a pergunta.")
        if len(pergunta) > 2000:
            raise ErroDaIa("Pergunta grande demais (até 2.000 caracteres).")
        if not catecismo.disponivel():
            raise ErroDaIa("O Catecismo ainda não foi baixado: rode ferramentas\\baixar_catecismo.py.")
        consultas = [pergunta]
        uso_total = []
        if not self.config.ia_falsa:
            dados, uso = self.pedir_json(INSTRUCOES_CONSULTAS, pergunta, "consultas", ESQUEMA_CONSULTAS, esforco="low")
            consultas += [c for c in dados.get("consultas", []) if isinstance(c, str)][:6]
            uso_total.append(uso)
        achados: dict[int, dict] = {}
        for c in consultas:
            for p in catecismo.buscar(c, 8):
                achados.setdefault(p["n"], p)
        for n in BASE_PECADO:
            p = catecismo.paragrafo(n)
            if p:
                achados.setdefault(n, p)
        material = "\n\n".join(f"[CIC {n}] ({' > '.join(p['secao'][-2:])})\n{p['texto']}" for n, p in sorted(achados.items()))
        entrada = f"PERGUNTA:\n{pergunta}\n\nPARÁGRAFOS DO CATECISMO ACHADOS PARA ESTA PERGUNTA:\n{material}"
        if self.config.ia_falsa:
            dados, uso = resposta_falsa(pergunta, achados), {"modelo": "falsa", "reserva": False, "usd": 0}
        else:
            dados, uso = self.pedir_json(INSTRUCOES_PERGUNTA, entrada, "resposta_moral", ESQUEMA_PERGUNTA)
        uso_total.append(uso)
        return {"pergunta": pergunta, **conferir_citacoes(dados, achados, catecismo, biblias),
                "uso": uso_total, "consultas": consultas[1:]}

    # ── revisor de orações ─────────────────────────────────────

    def revisar(self, titulo: str, texto: str, catecismo) -> dict:
        texto = (texto or "").strip()
        if len(texto) < 10:
            raise ErroDaIa("Escreva um pouco mais antes de pedir a revisão.")
        if len(texto) > 8000:
            raise ErroDaIa("Oração grande demais para revisar de uma vez (até 8.000 caracteres).")
        base = "\n\n".join(f"[CIC {p['n']}] {p['texto']}" for p in (catecismo.paragrafo(n) for n in BASE_ORACAO) if p)
        entrada = f"TÍTULO: {titulo or '(sem título)'}\n\nORAÇÃO:\n{texto}\n\nDO CATECISMO, SOBRE A ORAÇÃO:\n{base}"
        if self.config.ia_falsa:
            dados, uso = revisao_falsa(texto), {"modelo": "falsa", "reserva": False, "usd": 0}
        else:
            dados, uso = self.pedir_json(INSTRUCOES_REVISAO, entrada, "revisao_oracao", ESQUEMA_REVISAO)
        sugestoes = []
        for s in dados.get("sugestoes", []):
            if isinstance(s, dict) and s.get("sugestao"):
                s["no_texto"] = bool(s.get("trecho")) and s["trecho"] in texto
                sugestoes.append(s)
        dados["sugestoes"] = sugestoes
        return {**dados, "uso": [uso]}


def conferir_citacoes(dados: dict, achados: dict, catecismo, biblias) -> dict:
    cic = []
    vistos = set()
    for c in dados.get("catecismo", []):
        try:
            n = int(c.get("n"))
        except (TypeError, ValueError, AttributeError):
            continue
        if n in vistos:
            continue
        vistos.add(n)
        p = catecismo.paragrafo(n)
        cic.append({"n": n, "porque": str(c.get("porque", "")), "existe": bool(p), "texto": p["texto"] if p else "",
                    "secao": p["secao"] if p else [], "do_material": n in achados})
    biblia = []
    for b in dados.get("biblia", []):
        ref = str(b.get("ref", "")).strip().upper().replace(" ", "")
        m = REF_BIBLIA.match(ref)
        versos = []
        if m:
            livro, cap, de, ate = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3))
            versos = biblias.versos("AM", livro, cap, de, min(ate, de + 12))
        biblia.append({"ref": ref, "porque": str(b.get("porque", "")), "existe": bool(versos),
                       "versos": [{"v": n, "texto": t} for n, t in versos]})
    materia = dados.get("materia") if dados.get("materia") in MATERIAS else "depende"
    explicacao = [str(p) for p in dados.get("explicacao", []) if str(p).strip()]
    return {"resumo": str(dados.get("resumo", "")), "materia": materia, "explicacao": explicacao,
            "catecismo": cic, "biblia": biblia, "conselho": str(dados.get("conselho", ""))}


def resposta_falsa(pergunta: str, achados: dict) -> dict:
    """Resposta de demonstração, sem rede: usa os § achados pela busca de verdade."""
    primeiros = [n for n in achados if n not in BASE_PECADO][:3] or list(achados)[:3]
    return {"resumo": "Resposta de demonstração (IA de mentira, nada foi enviado a lugar nenhum).",
            "materia": "depende",
            "explicacao": ["Esta é a IA de demonstração: ela não pensa, só mostra o caminho que a resposta faz.",
                           "Com a chave configurada, a resposta vem do modelo escolhido, sempre com o Catecismo primeiro."],
            "catecismo": [{"n": n, "porque": "Achado pela busca para esta pergunta."} for n in primeiros] + [{"n": 1857, "porque": "As três condições do pecado mortal."}],
            "biblia": [{"ref": "MAT.26.41", "porque": "Vigiar e orar."}],
            "conselho": "Em caso concreto, converse com um padre na confissão."}


def revisao_falsa(texto: str) -> dict:
    primeira = texto.strip().split("\n")[0][:60]
    return {"comentario": "Revisão de demonstração (IA de mentira): com a chave configurada, a revisão é feita de verdade.",
            "pontos_fortes": ["Você escreveu com as suas palavras."],
            "sugestoes": [{"trecho": primeira, "sugestao": primeira + " (exemplo de sugestão)", "porque": "Só para mostrar como fica."}],
            "alerta_doutrinal": "", "versao_revisada": texto}


MATERIAS = ("grave", "pode_ser_grave", "leve", "nao_e_pecado", "depende", "fora_do_tema")

INSTRUCOES_CONSULTAS = """Você ajuda a buscar parágrafos no Catecismo da Igreja Católica (texto em português de Portugal).
Recebe uma pergunta sobre fé ou moral. Devolva de 2 a 6 consultas curtas (2 a 5 palavras cada) com os termos que
o Catecismo usaria para tratar o assunto: a virtude e o mandamento envolvidos, o nome técnico do pecado ou do ato
(ex.: "ofensas à castidade", "respeito pelo corpo", "preceitos da Igreja", "falso testemunho mentira").
Não responda à pergunta."""

ESQUEMA_CONSULTAS = {"type": "object", "properties": {"consultas": {"type": "array", "items": {"type": "string"}}},
                     "required": ["consultas"], "additionalProperties": False}

INSTRUCOES_PERGUNTA = """Você ajuda um católico a entender, à luz do ensinamento da Igreja, se algo é pecado e quão grave é a matéria.

FONTES, NESTA ORDEM:
1. Base principal: o Catecismo da Igreja Católica (CIC). Os parágrafos achados para a pergunta vêm no material, com o número. Fundamente a resposta neles primeiro. Pode citar outro § só se tiver certeza do número e do conteúdo; nunca invente número.
2. Base secundária: a Sagrada Escritura, como apoio ao que o CIC diz. Referência no formato LIVRO.CAP.VERSO ou LIVRO.CAP.VERSO-VERSO, com o código USFM do livro (GEN, EXO, PSA, PRO, SIR, WIS, MAT, MRK, LUK, JHN, ROM, 1CO, GAL, EPH, JAS, 1JN...) e a numeração da Bíblia Ave-Maria (Salmos pela numeração grega da Vulgata: o "Senhor é meu pastor" é PSA.22.1).

REGRAS:
- Nunca diga que a pessoa "está em pecado mortal" nem dê veredito sobre a alma dela: o pecado mortal pede três condições juntas (matéria grave, pleno conhecimento e consentimento deliberado, CIC 1857-1859), e as duas últimas só ela e o confessor podem avaliar. Diga a gravidade da MATÉRIA.
- "materia": grave (o CIC trata como grave), pode_ser_grave (depende de dano, intenção ou circunstância), leve (venial pela natureza), nao_e_pecado, depende (faltam dados; diga quais), fora_do_tema (não é pergunta de fé ou moral).
- Se não é pecado, diga com clareza e por quê. Não aumente a culpa de ninguém nem diminua o que o CIC chama de grave.
- Lembre, quando couber, que a confissão perdoa todo pecado de quem se arrepende, e que um caso concreto se conversa com um padre.
- Risco à vida (suicídio, automutilação, violência): diga com cuidado para procurar ajuda agora, CVV no 188 (ligação gratuita, 24 horas) ou cvv.org.br.
- Português do Brasil, claro, direto e respeitoso, sem moralismo e sem enrolar. A explicação em 2 a 5 parágrafos curtos.
- O material vem em português de Portugal; escreva em português do Brasil."""

ESQUEMA_PERGUNTA = {
    "type": "object",
    "properties": {
        "resumo": {"type": "string"},
        "materia": {"type": "string", "enum": list(MATERIAS)},
        "explicacao": {"type": "array", "items": {"type": "string"}},
        "catecismo": {"type": "array", "items": {"type": "object", "properties": {"n": {"type": "integer"}, "porque": {"type": "string"}},
                                                  "required": ["n", "porque"], "additionalProperties": False}},
        "biblia": {"type": "array", "items": {"type": "object", "properties": {"ref": {"type": "string"}, "porque": {"type": "string"}},
                                               "required": ["ref", "porque"], "additionalProperties": False}},
        "conselho": {"type": "string"},
    },
    "required": ["resumo", "materia", "explicacao", "catecismo", "biblia", "conselho"],
    "additionalProperties": False,
}

INSTRUCOES_REVISAO = """Você revisa uma oração pessoal escrita por um católico, com carinho e honestidade.

O QUE FAZER:
- Respeitar a voz dele: é uma oração pessoal, não um texto para concurso. Não deixe rebuscado nem troque o jeito simples de falar por linguagem de missal, a não ser que ele já escreva assim.
- Conferir a doutrina pelo Catecismo (base principal; trechos sobre a oração vêm no material) e pela Bíblia: por exemplo, santos e Nossa Senhora são intercessores, não a fonte da graça; não se "exige" nada de Deus; a oração termina em Deus. Se houver algo contrário à fé, explique em "alerta_doutrinal" com o § do CIC; se não houver, deixe vazio.
- Sugerir o que melhoraria: as quatro atitudes da oração (adoração e louvor, contrição, ação de graças, súplica e intercessão, CIC 2626-2643), clareza, repetição desnecessária, um fecho ("por Cristo, nosso Senhor. Amém", ou "Amém").
- Em "sugestoes", "trecho" é um pedaço COPIADO EXATAMENTE do texto dele (para a página achar e destacar) e "sugestao" é como ficaria. Até 6 sugestões, as mais importantes primeiro.
- "versao_revisada": a oração inteira com as sugestões aplicadas, na voz dele.
- Português do Brasil, curto e gentil."""

ESQUEMA_REVISAO = {
    "type": "object",
    "properties": {
        "comentario": {"type": "string"},
        "pontos_fortes": {"type": "array", "items": {"type": "string"}},
        "sugestoes": {"type": "array", "items": {"type": "object", "properties": {
            "trecho": {"type": "string"}, "sugestao": {"type": "string"}, "porque": {"type": "string"}},
            "required": ["trecho", "sugestao", "porque"], "additionalProperties": False}},
        "alerta_doutrinal": {"type": "string"},
        "versao_revisada": {"type": "string"},
    },
    "required": ["comentario", "pontos_fortes", "sugestoes", "alerta_doutrinal", "versao_revisada"],
    "additionalProperties": False,
}
