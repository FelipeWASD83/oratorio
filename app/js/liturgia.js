// liturgia.js: o calendário litúrgico do Brasil, calculado (sem rede e sem DOM, para o teste do Node).
//
// O que é calculado aqui: a Páscoa e tudo que depende dela, os tempos (Advento, Natal,
// Quaresma, Páscoa, Comum), a semana, o ano A/B/C e o ciclo I/II, a cor do dia, as
// transferências do Brasil (Epifania, Ascensão, São Pedro e São Paulo, Assunção e Todos
// os Santos vão para o domingo; Corpus Christi fica na quinta) e os dias de jejum,
// abstinência e preceito. Os santos de data fixa vêm de dados/santos.json (do romcal).
//
// Datas são "dias corridos" (número inteiro de dias desde 1970 em UTC), para a conta
// não sofrer com horário de verão; `dataDe(ano, mes, dia)` e `partes(n)` convertem.

export const CORES = {
  verde: { nome: 'verde', hex: '#2f6b3a' },
  roxo: { nome: 'roxo', hex: '#5b3a7a' },
  branco: { nome: 'branco', hex: '#a07c22' },   // branco litúrgico na tela vira dourado: branco no papel some
  vermelho: { nome: 'vermelho', hex: '#a3242b' },
  rosa: { nome: 'rosa', hex: '#b5506f' },
};

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export { DIAS_SEMANA, MESES };

export const dataDe = (ano, mes, dia) => Math.round(Date.UTC(ano, mes - 1, dia) / 86400000);
export function partes(n) {
  const d = new Date(n * 86400000);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), semana: d.getUTCDay() };
}
export const diaDaSemana = (n) => ((n % 7) + 11) % 7;   // 1/1/1970 foi quinta (4)
export function hoje(agora = new Date()) {
  return dataDe(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}
const domingoAteOuAntes = (n) => n - diaDaSemana(n);
/** O domingo entre `de` e `de + 6` (inclusive). */
const domingoEntre = (de) => de + (7 - diaDaSemana(de)) % 7;

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return dataDe(ano, mes, dia);
}

/** Primeiro domingo do Advento do ano civil dado. */
export function advento(ano) {
  const natal = dataDe(ano, 12, 25);
  const quarto = natal - (diaDaSemana(natal) || 7);
  return quarto - 21;
}

/** As datas que dependem da Páscoa e do Natal, para um ano civil (Brasil). */
export function datasDoAno(ano) {
  const p = pascoa(ano);
  const epifania = domingoEntre(dataDe(ano, 1, 2));
  const batismo = (partes(epifania).dia >= 7) ? epifania + 1 : epifania + 7;
  const natalAnterior = dataDe(ano - 1, 12, 25);
  let sagradaFamilia = domingoEntre(dataDe(ano, 12, 26));
  if (sagradaFamilia > dataDe(ano, 12, 31)) sagradaFamilia = dataDe(ano, 12, 30);
  return {
    pascoa: p, cinzas: p - 46, ramos: p - 7, quintaSanta: p - 3, sextaSanta: p - 2, sabadoSanto: p - 1,
    misericordia: p + 7, ascensao: p + 42, pentecostes: p + 49, maeDaIgreja: p + 50, trindade: p + 56,
    corpusChristi: p + 60, sagradoCoracao: p + 68, imaculadoCoracao: p + 69,
    epifania, batismo, natalAnterior, advento: advento(ano), cristoRei: advento(ano) - 7,
    natal: dataDe(ano, 12, 25), sagradaFamilia,
  };
}

/** O ano litúrgico (A, B, C) e o ciclo dos dias de semana (I, II) de um dia. */
export function cicloDe(n) {
  const { ano } = partes(n);
  const inicio = n >= advento(ano) ? ano : ano - 1;        // o Advento que abriu este ano litúrgico
  return { domingos: 'CAB'[(inicio + 1) % 3], semana: (inicio + 1) % 2 ? 'I' : 'II' };
}

/** Tempo litúrgico, semana e cor do tempo. */
export function tempoDe(n) {
  const { ano } = partes(n);
  const D = datasDoAno(ano);
  const ds = diaDaSemana(n);
  if (n >= D.advento) {
    if (n >= D.natal) return natalino(n, D.natal);
    const semana = Math.floor((n - D.advento) / 7) + 1;
    return { tempo: 'advento', nome: 'Advento', semana, cor: ds === 0 && semana === 3 ? 'rosa' : 'roxo' };
  }
  if (n <= D.batismo) return natalino(n, D.natalAnterior, D.batismo);
  if (n < D.cinzas) return comum(n, D.batismo + 1);
  if (n < D.quintaSanta) {
    if (n < D.cinzas + 4) return { tempo: 'quaresma', nome: 'Quaresma', semana: 0, cor: 'roxo', cinzas: n === D.cinzas };
    const semana = Math.floor((n - (D.cinzas + 4)) / 7) + 1;
    if (n >= D.ramos) return { tempo: 'santa', nome: 'Semana Santa', semana: 6, cor: n === D.ramos ? 'vermelho' : 'roxo' };
    return { tempo: 'quaresma', nome: 'Quaresma', semana, cor: ds === 0 && semana === 4 ? 'rosa' : 'roxo' };
  }
  if (n < D.pascoa) {
    const cor = n === D.sextaSanta ? 'vermelho' : n === D.quintaSanta ? 'branco' : 'roxo';
    return { tempo: 'triduo', nome: 'Tríduo Pascal', semana: 0, cor };
  }
  if (n <= D.pentecostes) {
    const semana = Math.floor((n - D.pascoa) / 7) + 1;
    return { tempo: 'pascoa', nome: 'Tempo Pascal', semana, cor: n === D.pentecostes ? 'vermelho' : 'branco', oitava: n - D.pascoa < 8 };
  }
  // Tempo Comum depois de Pentecostes: conta para trás a partir de Cristo Rei (34ª semana).
  const semana = 34 - Math.floor((D.cristoRei - domingoAteOuAntes(n)) / 7);
  return { tempo: 'comum', nome: 'Tempo Comum', semana, cor: 'verde' };
}

function natalino(n, natal, batismo = null) {
  const oitava = n - natal < 8;
  return { tempo: 'natal', nome: 'Tempo do Natal', semana: Math.floor((n - natal) / 7) + 1, cor: 'branco', oitava, fim: batismo };
}

function comum(n, inicio) {
  // A 1ª semana começa no dia seguinte ao Batismo; cada domingo abre a semana seguinte.
  const semana = Math.floor((domingoAteOuAntes(n) - domingoAteOuAntes(inicio)) / 7) + 1;
  return { tempo: 'comum', nome: 'Tempo Comum', semana, cor: 'verde' };
}

// ── celebrações ──────────────────────────────────────────────

// Precedência (menor vence), pelas Normas Universais do Ano Litúrgico, simplificada.
const PREC = { triduo: 1, privilegiado: 2, solenidade: 3, solenidadePropria: 4, festaDoSenhor: 5, domingo: 6,
  festa: 7, feriaPrivilegiada: 9, memoria: 10, facultativa: 12, feria: 13 };

function moveis(ano) {
  const D = datasDoAno(ano);
  return [
    { n: D.cinzas, nome: 'Quarta-feira de Cinzas', grau: 'privilegiado', cor: 'roxo' },
    { n: D.ramos, nome: 'Domingo de Ramos e da Paixão do Senhor', grau: 'privilegiado', cor: 'vermelho' },
    { n: D.ramos + 1, nome: 'Segunda-feira da Semana Santa', grau: 'privilegiado', cor: 'roxo' },
    { n: D.ramos + 2, nome: 'Terça-feira da Semana Santa', grau: 'privilegiado', cor: 'roxo' },
    { n: D.ramos + 3, nome: 'Quarta-feira da Semana Santa', grau: 'privilegiado', cor: 'roxo' },
    { n: D.quintaSanta, nome: 'Quinta-feira Santa: Ceia do Senhor', grau: 'triduo', cor: 'branco' },
    { n: D.sextaSanta, nome: 'Sexta-feira Santa: Paixão do Senhor', grau: 'triduo', cor: 'vermelho' },
    { n: D.sabadoSanto, nome: 'Sábado Santo: Vigília Pascal à noite', grau: 'triduo', cor: 'roxo' },
    { n: D.pascoa, nome: 'Domingo de Páscoa da Ressurreição do Senhor', grau: 'triduo', cor: 'branco' },
    ...[1, 2, 3, 4, 5, 6].map((i) => ({ n: D.pascoa + i, nome: `${DIAS_SEMANA[i][0].toUpperCase() + DIAS_SEMANA[i].slice(1)} da Oitava da Páscoa`, grau: 'privilegiado', cor: 'branco' })),
    { n: D.misericordia, nome: '2º Domingo da Páscoa: Domingo da Divina Misericórdia', grau: 'privilegiado', cor: 'branco' },
    { n: D.ascensao, nome: 'Ascensão do Senhor', grau: 'privilegiado', cor: 'branco' },
    { n: D.pentecostes, nome: 'Domingo de Pentecostes', grau: 'privilegiado', cor: 'vermelho' },
    { n: D.maeDaIgreja, nome: 'Bem-aventurada Virgem Maria, Mãe da Igreja', grau: 'memoria', cor: 'branco' },
    { n: D.trindade, nome: 'Santíssima Trindade', grau: 'solenidade', cor: 'branco' },
    { n: D.corpusChristi, nome: 'Santíssimo Corpo e Sangue de Cristo (Corpus Christi)', grau: 'solenidade', cor: 'branco', preceito: true },
    { n: D.sagradoCoracao, nome: 'Sagrado Coração de Jesus', grau: 'solenidade', cor: 'branco' },
    { n: D.imaculadoCoracao, nome: 'Imaculado Coração da Virgem Maria', grau: 'memoria', cor: 'branco' },
    { n: D.cristoRei, nome: 'Nosso Senhor Jesus Cristo, Rei do Universo', grau: 'solenidade', cor: 'branco' },
    { n: D.natal, nome: 'Natal do Senhor', grau: 'privilegiado', cor: 'branco', preceito: true },
    { n: D.sagradaFamilia, nome: 'Sagrada Família de Jesus, Maria e José', grau: 'festaDoSenhor', cor: 'branco' },
    { n: dataDe(ano, 1, 1), nome: 'Santa Maria, Mãe de Deus', grau: 'solenidade', cor: 'branco', preceito: true },
    { n: D.epifania, nome: 'Epifania do Senhor', grau: 'privilegiado', cor: 'branco' },
    { n: D.batismo, nome: 'Batismo do Senhor', grau: 'festaDoSenhor', cor: 'branco' },
  ];
}

const CHAVES_MOVEIS_NO_JSON = new Set(['immaculate_heart_of_mary', 'mary_mother_of_the_church']);
const FESTAS_DO_SENHOR = new Set(['presentation_of_the_lord', 'transfiguration', 'exaltation_of_the_holy_cross',
  'dedication_of_the_lateran_basilica']);
const PRECEITO_FIXO = new Set(['immaculate_conception_of_the_blessed_virgin_mary']);

/** Onde cada santo cai no ano dado, com as transferências do Brasil e da Semana Santa. */
function fixos(ano, santos) {
  const D = datasDoAno(ano);
  const saida = [];
  for (const s of santos) {
    if (!s.mes || CHAVES_MOVEIS_NO_JSON.has(s.chave)) continue;
    let n = dataDe(ano, s.mes, s.dia);
    let grau = s.grau === 'festa' && FESTAS_DO_SENHOR.has(s.chave) ? 'festaDoSenhor' : s.grau;
    if (s.brasil && s.grau === 'solenidade' && s.chave === 'our_lady_of_aparecida') grau = 'solenidadePropria';
    // Brasil: estas solenidades vão para o domingo (diretório litúrgico da CNBB)
    if (s.chave === 'peter_and_paul_apostles') n = domingoEntre(dataDe(ano, 6, 28));
    if (s.chave === 'assumption_of_the_blessed_virgin_mary') n = domingoEntre(dataDe(ano, 8, 14));
    if (s.chave === 'all_saints') n = domingoEntre(dataDe(ano, 10, 31));
    if (s.chave === 'commemoration_of_all_the_faithful_departed') {
      const todosOsSantos = domingoEntre(dataDe(ano, 10, 31));
      if (todosOsSantos === n) n += 1;
    }
    // São José e Anunciação na Semana Santa ou na Oitava da Páscoa
    if (s.chave === 'joseph_spouse_of_mary' && n >= D.ramos && n <= D.pascoa + 7) n = D.ramos - 1;
    if (s.chave === 'annunciation_of_the_lord' && n >= D.ramos && n <= D.pascoa + 7) n = D.misericordia + 1;
    saida.push({ n, nome: s.nome, grau, cor: s.cor || 'branco', chave: s.chave, preceito: PRECEITO_FIXO.has(s.chave) });
  }
  return saida;
}

let cacheAno = new Map();
/** Todas as celebrações de um ano civil, por dia: Map(n -> [celebrações]). */
export function celebracoesDoAno(ano, santos) {
  const chave = ano + ':' + santos.length;
  if (cacheAno.has(chave)) return cacheAno.get(chave);
  const mapa = new Map();
  for (const c of [...moveis(ano), ...fixos(ano, santos)]) {
    if (!mapa.has(c.n)) mapa.set(c.n, []);
    mapa.get(c.n).push(c);
  }
  // Solenidade num domingo do Advento, da Quaresma ou da Páscoa vai para a segunda-feira.
  for (const [n, lista] of [...mapa.entries()]) {
    if (diaDaSemana(n) !== 0) continue;
    const t = tempoDe(n).tempo;
    if (!['advento', 'quaresma', 'pascoa'].includes(t)) continue;
    for (const c of [...lista]) {
      if (c.grau === 'solenidade' || c.grau === 'solenidadePropria') {
        lista.splice(lista.indexOf(c), 1);
        if (!mapa.has(n + 1)) mapa.set(n + 1, []);
        mapa.get(n + 1).push({ ...c, transferida: true });
      }
    }
  }
  if (cacheAno.size > 6) cacheAno = new Map();
  cacheAno.set(chave, mapa);
  return mapa;
}

/**
 * O dia litúrgico: tempo, semana, ciclo, a celebração que vale, as outras do dia,
 * a cor e as obrigações (preceito, jejum, abstinência).
 */
export function diaLiturgico(n, santos = []) {
  const { ano } = partes(n);
  const t = tempoDe(n);
  const ds = diaDaSemana(n);
  const lista = celebracoesDoAno(ano, santos).get(n) || [];
  const domingo = ds === 0;
  const privilegiadoTempo = ['advento', 'quaresma', 'pascoa', 'santa'].includes(t.tempo);
  const precDia = domingo ? (privilegiadoTempo ? PREC.privilegiado : PREC.domingo)
    : t.tempo === 'santa' || t.tempo === 'triduo' || (t.tempo === 'pascoa' && t.oitava) ? PREC.privilegiado
      : t.tempo === 'quaresma' || (t.tempo === 'advento' && partes(n).mes === 12 && partes(n).dia >= 17) || (t.tempo === 'natal' && t.oitava) ? PREC.feriaPrivilegiada
        : PREC.feria;
  const ordenadas = [...lista].sort((a, b) => PREC[a.grau] - PREC[b.grau]);
  const vale = ordenadas.find((c) => PREC[c.grau] < precDia) || null;
  // Memória em dia de semana da Quaresma vira só comemoração (a cor e o nome do dia continuam os da Quaresma).
  const comemoracoes = t.tempo === 'quaresma' && !domingo
    ? ordenadas.filter((c) => c !== vale && (c.grau === 'memoria' || c.grau === 'facultativa'))
    : [];
  const outras = ordenadas.filter((c) => c !== vale && !comemoracoes.includes(c) && PREC[c.grau] >= PREC.memoria && !domingo && !['santa', 'triduo'].includes(t.tempo) && !(t.tempo === 'pascoa' && t.oitava));
  const facultativasNoDia = vale && vale.grau === 'facultativa';
  const cor = vale && !facultativasNoDia ? vale.cor : t.cor;
  const nomeDoDia = vale ? vale.nome : nomeDaFeria(n, t, ds);
  const D = datasDoAno(ano);
  const solenidadeHoje = vale && ['solenidade', 'solenidadePropria', 'privilegiado', 'triduo'].includes(vale.grau) && vale.n !== D.cinzas;
  const jejum = n === D.cinzas || n === D.sextaSanta;
  const abstinencia = jejum || (ds === 5 && !solenidadeHoje);
  return {
    n, ...partes(n), diaSemana: DIAS_SEMANA[ds],
    tempo: t.tempo, nomeTempo: t.nome, semanaTempo: t.semana,
    ciclo: cicloDe(n),
    nome: nomeDoDia, celebracao: vale, outras: [...outras, ...comemoracoes.map((c) => ({ ...c, comemoracao: true }))],
    grau: vale ? vale.grau : domingo ? 'domingo' : 'feria',
    cor, corHex: CORES[cor].hex,
    preceito: domingo || !!(vale && vale.preceito),
    jejum, abstinencia,
  };
}

const ORDINAL = (k) => k + 'ª';
const ORDINAL_M = (k) => k + 'º';

function nomeDaFeria(n, t, ds) {
  const p = partes(n);
  if (ds === 0) {
    if (t.tempo === 'comum') return `${ORDINAL_M(t.semana)} Domingo do Tempo Comum`;
    if (t.tempo === 'advento') return `${ORDINAL_M(t.semana)} Domingo do Advento` + (t.semana === 3 ? ' (Gaudete)' : '');
    if (t.tempo === 'quaresma') return `${ORDINAL_M(t.semana)} Domingo da Quaresma` + (t.semana === 4 ? ' (Laetare)' : '');
    if (t.tempo === 'pascoa') return `${ORDINAL_M(t.semana)} Domingo da Páscoa`;
    if (t.tempo === 'natal') return p.mes === 1 ? '2º Domingo depois do Natal' : 'Domingo no Tempo do Natal';
  }
  const dia = DIAS_SEMANA[ds][0].toUpperCase() + DIAS_SEMANA[ds].slice(1);
  if (t.tempo === 'comum') return `${dia} da ${ORDINAL(t.semana)} Semana do Tempo Comum`;
  if (t.tempo === 'advento') return p.mes === 12 && p.dia >= 17 ? `Dia ${p.dia} de dezembro (Advento)` : `${dia} da ${ORDINAL(t.semana)} Semana do Advento`;
  if (t.tempo === 'quaresma') return t.semana === 0 ? `${dia} depois das Cinzas` : `${dia} da ${ORDINAL(t.semana)} Semana da Quaresma`;
  if (t.tempo === 'pascoa') return `${dia} da ${ORDINAL(t.semana)} Semana da Páscoa`;
  if (t.tempo === 'natal') return t.oitava ? `${dia} da Oitava do Natal` : `${dia} do Tempo do Natal`;
  return dia;
}

/** Os 42 dias do mês para o calendário (começa no domingo), já com o dia litúrgico de cada um. */
export function mesLiturgico(ano, mes, santos) {
  const primeiro = dataDe(ano, mes, 1);
  const inicio = domingoAteOuAntes(primeiro);
  return Array.from({ length: 42 }, (_, i) => ({ ...diaLiturgico(inicio + i, santos), doMes: partes(inicio + i).mes === mes }));
}

export function dataPorExtenso(n) {
  const p = partes(n);
  return `${DIAS_SEMANA[p.semana]}, ${p.dia} de ${MESES[p.mes - 1]} de ${p.ano}`;
}

