"""Gera app/dados/santos.json, os santos e festas de data fixa do calendário litúrgico do Brasil.

Fonte: o romcal (https://github.com/romcal/romcal, licença MIT, Julian Pereira e
colaboradores), que já tem o calendário geral romano, o das Américas e o do Brasil
com as fontes de cada data (diretórios litúrgicos da CNBB e de dioceses). Os nomes
em português vêm do locale pt-br do mesmo projeto.

As festas que dependem da Páscoa (Cinzas, Ascensão, Pentecostes, Corpus Christi...)
e as transferências para o domingo no Brasil (Epifania, São Pedro e São Paulo,
Assunção, Todos os Santos) são calculadas na página, em `app/js/liturgia.js`.

Uso: python ferramentas\\gerar_calendario.py
"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "app" / "dados" / "santos.json"
BASE = "https://raw.githubusercontent.com/romcal/romcal/dev/rites/roman1969/src/"
ARQUIVOS = {
    "geral": "calendars/general-roman/index.ts",
    "americas": "calendars/regions/americas.ts",
    "brasil": "calendars/countries/brazil/index.ts",
    "nomes": "locales/pt-br.ts",
}
# dateFn do romcal que têm data fixa (a página cuida das que se movem e dos conflitos com a Semana Santa)
DATAS_DE_FUNCAO = {
    "presentationOfTheLord": (2, 2), "annunciation": (3, 25), "nativityOfJohnTheBaptist": (6, 24),
    "peterAndPaulApostles": (6, 29), "transfiguration": (8, 6), "assumption": (8, 15),
    "exaltationOfTheHolyCross": (9, 14), "allSaints": (11, 1), "immaculateConceptionOfMary": (12, 8),
}
MOVEIS = {"maryMotherOfTheChurch", "immaculateHeartOfMary"}
# Mártires do calendário do Brasil que o romcal não marca de vermelho (a cor vem do martirológio dele)
MARTIRES_BR = {"andrew_de_soveral_and_ambrose_francis_ferro_priests", "ignatius_de_azevedo_priest_and_companions_martyrs",
               "roch_gonzalez_alphonsus_rodriguez_and_john_del_castillo_priests"}


# Nomes que o locale pt-br do romcal não traz numa linha só (o gerador não acha): escritos à mão,
# na forma do diretório litúrgico.
NOMES_MANUAIS = {
    "basil_the_great_and_gregory_nazianzen_bishops": "Santos Basílio Magno e Gregório Nazianzeno, bispos e doutores da Igreja",
    "cyril_constantine_the_philosopher_monk_and_methodius_michael_of_thessaloniki_bishop": "Santos Cirilo, monge, e Metódio, bispo",
    "christopher_magallanes_priest_and_companions_martyrs": "São Cristóvão Magallanes, presbítero, e companheiros, mártires",
    "augustine_zhao_rong_priest_and_companions_martyrs": "Santo Agostinho Zhao Rong, presbítero, e companheiros, mártires",
    "ignatius_de_azevedo_priest_and_companions_martyrs": "Beatos Inácio de Azevedo, presbítero, e companheiros, mártires",
    "andrew_kim_tae_gon_priest_paul_chong_ha_sang_and_companions_martyrs": "Santos André Kim Tae-gon, presbítero, Paulo Chong Ha-sang e companheiros, mártires",
    "therese_of_the_child_jesus_and_the_holy_face_of_lisieux_virgin": "Santa Teresinha do Menino Jesus, virgem e doutora da Igreja",
    "andrew_de_soveral_and_ambrose_francis_ferro_priests": "Santos André de Soveral e Ambrósio Francisco Ferro, presbíteros, e companheiros, mártires",
    "john_de_brebeuf_isaac_jogues_priests_and_companions_martyrs": "Santos João de Brébeuf e Isaac Jogues, presbíteros, e companheiros, mártires",
    "dedication_of_the_basilicas_of_saints_peter_and_paul_apostles": "Dedicação das Basílicas de São Pedro e São Paulo, apóstolos",
    "roch_gonzalez_alphonsus_rodriguez_and_john_del_castillo_priests": "Santos Roque González, Afonso Rodríguez e João del Castillo, presbíteros e mártires",
}
# Cor que o romcal deixa para o martirológio e que a regra geral daqui erraria
CORES_MANUAIS = {"commemoration_of_all_the_faithful_departed": "roxo"}


def baixar(caminho: str) -> str:
    req = urllib.request.Request(BASE + caminho, headers={"User-Agent": "oratorio"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def entradas(ts: str) -> dict[str, str]:
    """{chave: corpo do objeto} das entradas de `inputs`."""
    inicio = ts.find("inputs")
    saida = {}
    for m in re.finditer(r"^\s{4}([a-z0-9_]+): \{", ts[inicio:], re.M):
        abre = inicio + m.end() - 1
        nivel, i = 0, abre
        while i < len(ts):
            if ts[i] == "{":
                nivel += 1
            elif ts[i] == "}":
                nivel -= 1
                if nivel == 0:
                    break
            i += 1
        saida[m.group(1)] = ts[abre:i + 1]
    return saida


def grau(precedencia: str) -> str:
    if "Solemnity" in precedencia:
        return "solenidade"
    if "Feast" in precedencia:
        return "festa"
    if "OptionalMemorial" in precedencia:
        return "facultativa"
    if "Memorial" in precedencia:
        return "memoria"
    return "?"


def main() -> None:
    fontes = {k: baixar(v) for k, v in ARQUIVOS.items()}
    nomes = dict(re.findall(r"^\s+([a-z0-9_]+): '((?:[^'\\]|\\.)*)'", fontes["nomes"], re.M))
    nomes.update(dict(re.findall(r'^\s+([a-z0-9_]+): "((?:[^"\\]|\\.)*)"', fontes["nomes"], re.M)))
    itens: dict[str, dict] = {}
    for origem in ("geral", "americas", "brasil"):
        for chave, corpo in entradas(fontes[origem]).items():
            atual = itens.get(chave, {"chave": chave})
            m = re.search(r"dateDef: \{ month: (\d+), date: (\d+) \}", corpo)
            f = re.search(r"dateFn: '(\w+)'", corpo)
            if m:
                atual["mes"], atual["dia"] = int(m.group(1)), int(m.group(2))
            elif f and f.group(1) in DATAS_DE_FUNCAO:
                atual["mes"], atual["dia"] = DATAS_DE_FUNCAO[f.group(1)]
            elif f and f.group(1) in MOVEIS:
                atual["movel"] = f.group(1)
            p = re.search(r"precedence: Precedences\.(\w+)", corpo)
            if p:
                atual["grau"] = grau(p.group(1))
            if "Colors.Red" in corpo or chave in MARTIRES_BR:
                atual["cor"] = "vermelho"
            elif "Colors.White" in corpo:
                atual["cor"] = "branco"
            local = re.search(r"customLocaleId: '(\w+)'", corpo)
            if local:
                atual["nome_id"] = local.group(1)
            if origem != "geral":
                atual["brasil"] = True
            itens[chave] = atual
    saida = []
    for item in itens.values():
        if "grau" not in item or ("mes" not in item and "movel" not in item):
            continue
        nome = NOMES_MANUAIS.get(item["chave"]) or nomes.get(item.pop("nome_id", item["chave"])) or nomes.get(item["chave"])
        item.pop("nome_id", None)
        if item["chave"] in CORES_MANUAIS:
            item["cor"] = CORES_MANUAIS[item["chave"]]
        if not nome:
            nome = item["chave"].replace("_", " ")
        item["nome"] = nome.replace("\\'", "'")
        item.setdefault("cor", "vermelho" if "martyr" in item["chave"] else "branco")
        saida.append(item)
    saida.sort(key=lambda x: (x.get("mes", 99), x.get("dia", 0), x["chave"]))
    corpo = {"fonte": "romcal (MIT), https://github.com/romcal/romcal: calendário geral romano, Américas e Brasil",
             "gerado_por": "ferramentas/gerar_calendario.py", "itens": saida}
    DESTINO.write_text(json.dumps(corpo, ensure_ascii=False, indent=1), encoding="utf-8")
    sem_nome = [i["chave"] for i in saida if " " in i["nome"] and i["nome"] == i["chave"].replace("_", " ")]
    print(f"{len(saida)} celebrações -> {DESTINO}")
    if sem_nome:
        print("Sem nome em português:", sem_nome)


if __name__ == "__main__":
    main()
