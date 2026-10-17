// plano.js: o plano de leitura dos 73 livros e a conversa com o plano da nova aba (sem DOM).
//
// O plano é o da nova aba do Felipe (ordem fácil: história antes de doutrina, curto
// antes de longo, o que depende de outro vem depois dele), com os sete livros que
// só a Bíblia católica tem encaixados onde a história deles pede: Tobias e Judite
// junto da volta do exílio, os Macabeus logo depois (a fé perseguida pouco antes
// de Jesus), Sabedoria e Eclesiástico com os livros de sabedoria e Baruc com Jeremias.
// Salmos e Provérbios correm em paralelo, um de cada por dia.
//
// "Próximo" é o primeiro capítulo NÃO marcado na ordem da trilha: ler fora do
// plano e marcar já conta. Os capítulos são os da Ave-Maria ('GEN.1').
//
// A nova aba conta os capítulos como as Bíblias protestantes (66 livros): os Salmos
// pela numeração hebraica (o "Senhor é meu pastor" é o 23, aqui é o 22), Joel com 3
// capítulos (aqui 4) e Malaquias com 4 (aqui 3). `daNovaAba` e `paraNovaAba` convertem.

export const ETAPAS = [
  { id: 'comeco', nome: 'O começo', livros: ['GEN'], porque: 'Gênesis inteiro: a criação, os patriarcas e a história de José, a melhor narrativa do livro.' },
  { id: 'lucas', nome: 'Lucas e a continuação', livros: ['LUK', 'ACT'], porque: 'Atos é a parte 2 de Lucas, do mesmo autor: a Igreja começando depois de Jesus.' },
  { id: 'apocalipse', nome: 'A chave do Apocalipse', livros: ['DAN', 'REV'], porque: 'O Apocalipse se entende muito melhor depois de Daniel, de onde vêm as imagens.' },
  { id: 'exodo', nome: 'A saída do Egito', livros: ['EXO'], porque: 'Continua Gênesis: os descendentes de José viram escravos e Moisés tira o povo do Egito.' },
  { id: 'joao', nome: 'Jesus por João', livros: ['JHN'], porque: 'O evangelho mais diferente dos outros, com os discursos longos de Jesus.' },
  { id: 'terra', nome: 'A terra prometida', livros: ['JOS', 'JDG', 'RUT'], porque: 'O povo entra na terra; Rute é curto e liga a história ao rei Davi.' },
  { id: 'davi', nome: 'Davi', livros: ['1SA', '2SA'], porque: 'A vida de Davi, que escreveu boa parte dos Salmos que você vai estar lendo junto.' },
  { id: 'cartas-curtas', nome: 'Cartas curtas', livros: ['PHP', 'EPH', 'COL', 'JAS', '1PE', '1JN'], porque: 'Cartas pequenas e diretas, cada uma lida em poucos dias.' },
  { id: 'evangelhos', nome: 'Os outros evangelhos', livros: ['MRK', 'MAT'], porque: 'Marcos é o mais curto e rápido; Mateus junta os ensinos de Jesus, como o Sermão da Montanha.' },
  { id: 'reis', nome: 'Os reis', livros: ['1KI', '2KI'], porque: 'De Salomão à queda de Jerusalém: o fundo de quase todos os profetas.' },
  { id: 'paulo', nome: 'As cartas de Paulo', livros: ['ROM', 'GAL', '1CO', '2CO', '1TH', '2TH'], porque: 'As cartas maiores. Romanos é a mais densa: aqui você já tem base para ela.' },
  { id: 'exilio', nome: 'A volta do exílio', livros: ['EZR', 'NEH', 'TOB', 'JDT', 'EST', 'JON'], porque: 'Histórias curtas e bem contadas: a reconstrução de Jerusalém, Tobias, Judite, Ester e Jonas.' },
  { id: 'macabeus', nome: 'Os Macabeus', livros: ['1MA', '2MA'], porque: 'A fé perseguida, uns 160 anos antes de Jesus: de onde vêm a festa da Dedicação e a oração pelos mortos (2Mc 12).' },
  { id: 'sabedoria', nome: 'Sabedoria', livros: ['JOB', 'ECC', 'SNG', 'WIS', 'SIR'], porque: 'Jó, Eclesiastes, Cântico, Sabedoria e Eclesiástico: poesia, conselho e perguntas difíceis.' },
  { id: 'lei', nome: 'A lei', livros: ['LEV', 'NUM', 'DEU', 'HEB'], porque: 'A parte mais pesada da Torá, com Hebreus junto, que explica o sentido dos sacrifícios.' },
  { id: 'profetas-maiores', nome: 'Os profetas maiores', livros: ['ISA', 'JER', 'LAM', 'BAR', 'EZK'], porque: 'Longos e intensos. Com Reis já lido, dá para saber com quem eles estão falando.' },
  { id: 'profetas-menores', nome: 'Os profetas menores', livros: ['HOS', 'JOL', 'AMO', 'OBA', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'], porque: 'Os doze curtos (menos Jonas, que já foi), de Oseias a Malaquias.' },
  { id: 'cartas-finais', nome: 'O resto das cartas', livros: ['1TI', '2TI', 'TIT', 'PHM', '2PE', '2JN', '3JN', 'JUD'], porque: 'As cartas pequenas que faltam, quase todas de um ou dois dias.' },
  { id: 'cronicas', nome: 'A história recontada', livros: ['1CH', '2CH'], porque: 'Crônicas reconta Samuel e Reis de outro ângulo: no fim, você reconhece tudo.' },
];

export const TRILHAS_DIARIAS = [
  { id: 'salmos', nome: 'Salmos', livros: ['PSA'], porque: 'Um por dia, junto com o plano: oração pronta para os dias bons e os ruins.' },
  { id: 'proverbios', nome: 'Provérbios', livros: ['PRO'], porque: 'Um por dia: 31 capítulos, um mês.' },
];

export const RITMOS = [1, 2, 3, 4, 5];
export const LIVROS_DO_PLANO = ETAPAS.flatMap((e) => e.livros);

/** livros: [[codigo, nome, abrev, testamento, capitulos], ...] (o livros.json) */
export function criarPlano(livros) {
  const porCodigo = new Map(livros.map((l) => [l[0], { codigo: l[0], nome: l[1], abrev: l[2], testamento: l[3], capitulos: l[4] }]));
  const caps = (c) => (porCodigo.get(c) || { capitulos: 0 }).capitulos;

  const contar = (lidos, codigos) => {
    let feitos = 0, total = 0;
    for (const c of codigos) {
      total += caps(c);
      for (let i = 1; i <= caps(c); i++) if (lidos.has(c + '.' + i)) feitos++;
    }
    return { feitos, total, fracao: total ? feitos / total : 0 };
  };

  const proximos = (lidos, codigos, n = 1, pular = new Set()) => {
    const saida = [];
    for (const c of codigos) {
      for (let i = 1; i <= caps(c) && saida.length < n; i++) {
        const ref = c + '.' + i;
        if (!lidos.has(ref) && !pular.has(ref)) saida.push(ref);
      }
      if (saida.length >= n) break;
    }
    return saida;
  };

  return {
    livro: (c) => porCodigo.get(c),
    contar,
    proximos,
    progressoTotal: (lidos) => contar(lidos, livros.map((l) => l[0])),
    etapaAtual: (lidos) => ETAPAS.find((e) => { const k = contar(lidos, e.livros); return k.feitos < k.total; }) || null,
    estimativa(lidos, ritmo, agora = Date.now()) {
      const { feitos, total } = contar(lidos, LIVROS_DO_PLANO);
      const dias = Math.ceil((total - feitos) / Math.max(1, ritmo));
      return { faltam: total - feitos, dias, termina: agora + dias * 86400000 };
    },
    /** A leitura de hoje: `ritmo` capítulos do plano, um Salmo e um Provérbio. */
    leituraDeHoje(lidos, ritmo, hojeGuardado, dia) {
      if (hojeGuardado && hojeGuardado.dia === dia && Array.isArray(hojeGuardado.itens)) return hojeGuardado;
      return {
        dia,
        itens: [
          ...proximos(lidos, LIVROS_DO_PLANO, ritmo).map((ref) => ({ ref, trilha: 'plano' })),
          ...TRILHAS_DIARIAS.flatMap((t) => proximos(lidos, t.livros, 1).map((ref) => ({ ref, trilha: t.id }))),
        ],
      };
    },
    maisUm(lidos, hojeAtual) {
      const ja = new Set(hojeAtual.itens.map((i) => i.ref));
      const [ref] = proximos(lidos, LIVROS_DO_PLANO, 1, ja);
      return ref ? { ...hojeAtual, itens: [...hojeAtual.itens, { ref, trilha: 'plano' }] } : hojeAtual;
    },
    foraDoPlano() {
      const no = new Set([...LIVROS_DO_PLANO, ...TRILHAS_DIARIAS.flatMap((t) => t.livros)]);
      return livros.map((l) => l[0]).filter((c) => !no.has(c));
    },
  };
}

// ── numeração: a da nova aba (protestante) e a da Ave-Maria ──────

/** Salmo pela numeração hebraica (a das Bíblias protestantes) -> salmo(s) na Ave-Maria (grega/Vulgata). */
export function salmoParaAveMaria(h) {
  if (h <= 8) return [h];
  if (h === 9 || h === 10) return [9];
  if (h <= 113) return [h - 1];
  if (h === 114 || h === 115) return [113];
  if (h === 116) return [114, 115];
  if (h <= 146) return [h - 1];
  if (h === 147) return [146, 147];
  return [h];
}

/** Capítulo da nova aba -> capítulos da Ave-Maria que ele cobre. */
export function daNovaAba(livro, cap) {
  if (livro === 'PSA') return salmoParaAveMaria(cap);
  if (livro === 'JOL') return cap === 1 ? [1] : cap === 2 ? [2, 3] : cap === 3 ? [4] : [];
  if (livro === 'MAL') return cap <= 3 ? [cap] : cap === 4 ? [3] : [];
  return [cap];
}

/** Os capítulos protestantes de um livro dos 66 (para converter de volta). */
const CAPS_PROTESTANTES = { PSA: 150, JOL: 3, MAL: 4, DAN: 12, EST: 10 };

/**
 * Lidos da Ave-Maria (Set de 'GEN.1') -> lidos no formato da nova aba ({ GEN: [1, 2] }).
 * Um capítulo da nova aba conta como lido quando todos os pedaços dele na Ave-Maria estão lidos.
 */
export function paraNovaAba(lidos, livros) {
  const saida = {};
  for (const l of livros) {
    const [codigo, , , , capsAM] = l;
    if (['TOB', 'JDT', '1MA', '2MA', 'WIS', 'SIR', 'BAR'].includes(codigo)) continue;
    const total = CAPS_PROTESTANTES[codigo] || capsAM;
    const marcados = [];
    for (let c = 1; c <= total; c++) {
      const partes = daNovaAba(codigo, c);
      if (partes.length && partes.every((p) => lidos.has(codigo + '.' + p))) marcados.push(c);
    }
    if (marcados.length) saida[codigo] = marcados;
  }
  return saida;
}

/** { GEN: [1, 2] } -> Set de 'GEN.1' (capítulos protestantes, sem converter). */
export function conjuntoDaNovaAba(objeto) {
  const s = new Set();
  for (const [livro, caps] of Object.entries(objeto || {})) for (const c of caps || []) s.add(livro + '.' + c);
  return s;
}

/**
 * Junta o plano daqui com o da nova aba, nos dois sentidos, sem perder desmarcação:
 * `visto` é como a nova aba estava na última vez (null na primeira).
 * Devolve { marcar: [refs AM], desmarcar: [refs AM], novaAba: {GEN: [...]}, visto: Set protestante }.
 */
export function juntarComNovaAba(lidosAqui, novaAbaAgora, visto, livros) {
  const agora = conjuntoDaNovaAba(novaAbaAgora);
  const antes = visto ? new Set(visto) : new Set();
  const marcar = new Set();
  const desmarcar = new Set();
  const converter = (ref) => {
    const [livro, cap] = ref.split('.');
    return daNovaAba(livro, Number(cap)).map((c) => livro + '.' + c);
  };
  for (const ref of agora) if (!antes.has(ref)) converter(ref).forEach((r) => { if (!lidosAqui.has(r)) marcar.add(r); });
  if (visto) for (const ref of antes) if (!agora.has(ref)) converter(ref).forEach((r) => { if (lidosAqui.has(r)) desmarcar.add(r); });
  const resultado = new Set(lidosAqui);
  marcar.forEach((r) => resultado.add(r));
  desmarcar.forEach((r) => resultado.delete(r));
  const novaAba = paraNovaAba(resultado, livros);
  return { marcar: [...marcar], desmarcar: [...desmarcar], novaAba, visto: [...conjuntoDaNovaAba(novaAba)] };
}

/** Ref protestante de versículo ('PSA.23.1-3', a da nova aba e do Vigia) -> ref na Ave-Maria. */
export function versoParaAveMaria(ref, deslocamentos) {
  const m = /^([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return ref;
  const [, livro] = m;
  let cap = Number(m[2]), de = Number(m[3]), ate = Number(m[4] || m[3]);
  if (livro === 'PSA') {
    const ams = salmoParaAveMaria(cap);
    const d = (deslocamentos && deslocamentos[cap]) || 0;
    cap = ams[0];
    de += d; ate += d;
  } else if (livro === 'JOL' && cap === 2 && de >= 28) { cap = 3; de -= 27; ate -= 27; }
  else if (livro === 'JOL' && cap === 3) cap = 4;
  else if (livro === 'MAL' && cap === 4) { cap = 3; de += 18; ate += 18; }
  return `${livro}.${cap}.${de}` + (ate !== de ? `-${ate}` : '');
}
