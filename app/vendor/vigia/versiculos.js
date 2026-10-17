// vigia/versiculos.js — os versículos do Vigia, na NTLH (a Bíblia do Felipe).
//
// Aqui ficam só as REFERÊNCIAS (escolhidas à mão). O texto tem direito
// autoral e não vai para o git: `python tools\gerar-versiculos-vigia.py` tira
// do cache do arvore-biblica (a mesma regra de lá) e grava
// `dados/vigia-versiculos.json`, que está no .gitignore. Sem esse arquivo, a
// tela mostra a referência com o link para ler no bible.com.
//
// Formato da referência: o do bible.com (USFM), 'MAT.26.41' ou 'MAT.5.27-28'.

// Um por dia: força, fé, domínio próprio, esperança, pureza.
export const DO_DIA = [
  'PSA.1.1-2', 'PSA.4.8', 'PSA.16.8', 'PSA.18.2', 'PSA.19.14', 'PSA.23.1-3', 'PSA.27.1',
  'PSA.27.14', 'PSA.28.7', 'PSA.30.5', 'PSA.31.24', 'PSA.32.8', 'PSA.34.4', 'PSA.34.18',
  'PSA.37.4-5', 'PSA.37.23-24', 'PSA.40.1-2', 'PSA.42.11', 'PSA.46.1', 'PSA.46.10',
  'PSA.51.10', 'PSA.55.22', 'PSA.56.3', 'PSA.62.1-2', 'PSA.73.26', 'PSA.86.5',
  'PSA.90.12', 'PSA.91.1-2', 'PSA.94.18-19', 'PSA.100.4-5', 'PSA.103.2-4', 'PSA.103.12',
  'PSA.118.24', 'PSA.119.9', 'PSA.119.11', 'PSA.119.105', 'PSA.121.1-2', 'PSA.138.8',
  'PSA.139.23-24', 'PSA.143.10', 'PSA.145.18', 'PSA.147.3',
  'PRO.3.5-6', 'PRO.4.23', 'PRO.16.3', 'PRO.16.32', 'PRO.18.10', 'PRO.24.16', 'PRO.25.28',
  'PRO.27.17', 'PRO.28.13',
  'ISA.26.3', 'ISA.40.29', 'ISA.40.31', 'ISA.41.10', 'ISA.41.13', 'ISA.43.2', 'ISA.43.18-19',
  'ISA.54.10', 'ISA.55.8-9', 'ISA.58.11', 'JER.17.7-8', 'JER.29.11', 'LAM.3.22-23',
  'LAM.3.25-26', 'MIC.7.8', 'ZEP.3.17', 'NAM.1.7', 'HAB.3.19', 'JOS.1.9', 'DEU.31.6',
  '1SA.16.7', '2CH.7.14', 'NEH.8.10', 'ECC.3.1', 'ECC.4.9-10',
  'MAT.5.8', 'MAT.5.14', 'MAT.6.33', 'MAT.6.34', 'MAT.7.7', 'MAT.11.28-30', 'MAT.19.26',
  'MAT.26.41', 'MAT.28.20', 'MRK.9.23', 'MRK.10.27', 'LUK.1.37', 'LUK.9.23', 'JHN.1.5',
  'JHN.3.16', 'JHN.8.12', 'JHN.8.36', 'JHN.10.10', 'JHN.14.1', 'JHN.14.27', 'JHN.15.5',
  'JHN.16.33',
  'ROM.5.3-5', 'ROM.5.8', 'ROM.6.6', 'ROM.6.14', 'ROM.8.1', 'ROM.8.18', 'ROM.8.28',
  'ROM.8.31', 'ROM.8.37-39', 'ROM.12.1', 'ROM.12.2', 'ROM.12.12', 'ROM.12.21', 'ROM.13.14',
  'ROM.15.13', '1CO.6.19-20', '1CO.9.24-25', '1CO.10.13', '1CO.15.57-58', '1CO.16.13',
  '2CO.4.16-18', '2CO.5.17', '2CO.10.5', '2CO.12.9', 'GAL.2.20', 'GAL.5.1', 'GAL.5.16',
  'GAL.5.22-23', 'GAL.6.9', 'EPH.2.8-10', 'EPH.3.20', 'EPH.4.22-24', 'EPH.6.10-11',
  'PHP.1.6', 'PHP.3.13-14', 'PHP.4.6-7', 'PHP.4.8', 'PHP.4.13', 'PHP.4.19', 'COL.3.1-2',
  'COL.3.23', '1TH.5.16-18', '2TH.3.3', '1TI.4.12', '1TI.6.11', '2TI.1.7', '2TI.2.22',
  'TIT.2.11-12', 'HEB.4.15-16', 'HEB.10.23', 'HEB.12.1-2', 'HEB.12.11', 'HEB.13.5',
  'JAS.1.2-4', 'JAS.1.5', 'JAS.1.12', 'JAS.4.7-8', '1PE.2.11', '1PE.5.6-7', '1PE.5.8-9',
  '2PE.1.3', '1JN.1.9', '1JN.4.4', '1JN.5.4', 'JUD.1.24-25', 'REV.3.20', 'REV.21.4',
];

// Na tela de aviso e de bloqueio: sobre a luxúria e sobre fugir dela.
export const LUXURIA = [
  'MAT.5.27-28', 'MAT.5.29', 'MAT.26.41', 'JOB.31.1', 'PSA.101.3', 'PSA.119.37', 'PSA.119.9',
  'PRO.4.23', 'PRO.4.25-27', 'PRO.6.25', 'PRO.6.27-28', 'PRO.5.3-5', 'PRO.7.21-23',
  'PRO.7.25-27', '1CO.6.13', '1CO.6.18', '1CO.6.19-20', '1CO.10.13', '1TH.4.3-5', '1TH.4.7',
  'GAL.5.16', 'GAL.5.24', 'ROM.13.14', 'ROM.6.12-13', 'ROM.8.13', 'COL.3.5', 'EPH.5.3',
  '2TI.2.22', 'TIT.2.11-12', 'JAS.1.14-15', '1PE.2.11', '1JN.2.15-17', 'HEB.13.4',
  'GEN.39.9', 'GEN.39.12', 'MAT.6.13', 'MRK.14.38', 'ROM.12.1', '2CO.10.5', 'PHP.4.8',
];

// "Tô com vontade": aguentar agora.
export const VONTADE = [
  '1CO.10.13', 'JAS.4.7', 'HEB.4.15-16', 'MAT.26.41', 'GAL.5.16', 'PSA.46.1', 'ISA.41.10',
  '2TI.2.22', 'PHP.4.8', '2CO.10.5', 'ROM.8.37', 'PSA.119.11', '1PE.5.8-9', 'EPH.6.10-11',
  'JHN.16.33', '1JN.4.4', 'PSA.121.1-2', 'ROM.12.21', 'PRO.25.28', 'GEN.39.12',
];

// Depois de "Recaí": levantar, sem condenação.
export const QUEDA = [
  '1JN.1.9', 'LAM.3.22-23', 'PSA.51.10-12', 'PRO.24.16', 'MIC.7.8', 'ROM.8.1', 'PSA.103.12',
  'ISA.1.18', '2CO.5.17', 'PHP.3.13-14', 'PSA.34.18', 'PSA.145.14', 'HEB.4.16', 'ISA.43.25',
  'PSA.32.5', 'LUK.15.20',
];

// Nome de cada livro usado acima (USFM → como a NTLH escreve).
export const LIVROS = {
  GEN: 'Gênesis', DEU: 'Deuteronômio', JOS: 'Josué', '1SA': '1 Samuel', '2CH': '2 Crônicas',
  NEH: 'Neemias', JOB: 'Jó', PSA: 'Salmos', PRO: 'Provérbios', ECC: 'Eclesiastes',
  ISA: 'Isaías', JER: 'Jeremias', LAM: 'Lamentações', MIC: 'Miquéias', NAM: 'Naum',
  HAB: 'Habacuque', ZEP: 'Sofonias', MAT: 'Mateus', MRK: 'Marcos', LUK: 'Lucas', JHN: 'João',
  ROM: 'Romanos', '1CO': '1 Coríntios', '2CO': '2 Coríntios', GAL: 'Gálatas', EPH: 'Efésios',
  PHP: 'Filipenses', COL: 'Colossenses', '1TH': '1 Tessalonicenses', '2TH': '2 Tessalonicenses',
  '1TI': '1 Timóteo', '2TI': '2 Timóteo', TIT: 'Tito', HEB: 'Hebreus', JAS: 'Tiago',
  '1PE': '1 Pedro', '2PE': '2 Pedro', '1JN': '1 João', JUD: 'Judas', REV: 'Apocalipse',
};

const REF = /^([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)(?:-(\d+))?$/;

/** 'MAT.5.27-28' → { livro, capitulo, de, ate }, ou null. */
export function partes(ref) {
  const m = REF.exec(String(ref));
  if (!m) return null;
  const de = Number(m[3]);
  const ate = m[4] ? Number(m[4]) : de;
  return ate >= de ? { livro: m[1], capitulo: Number(m[2]), de, ate } : null;
}

/** 'MAT.5.27-28' → 'Mateus 5.27-28' (o jeito da NTLH: capítulo.versículo). */
export function referenciaLegivel(ref) {
  const p = partes(ref);
  if (!p) return String(ref);
  return (LIVROS[p.livro] || p.livro) + ' ' + p.capitulo + '.' + p.de + (p.ate !== p.de ? '-' + p.ate : '');
}

/** O versículo no bible.com, na NTLH (id 211, o mesmo do arvore-biblica). */
export function linkBibleCom(ref) {
  return 'https://www.bible.com/pt/bible/211/' + ref + '.NTLH';
}

/** Número do dia no fuso do PC (muda à meia-noite local). */
function numeroDoDia(agora) {
  const d = new Date(agora);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/**
 * O versículo do dia: o mesmo em toda aba o dia inteiro, e a lista inteira
 * passa antes de repetir (o passo 7919 é primo, então percorre tudo).
 */
export function doDia(agora = Date.now(), lista = DO_DIA) {
  const n = lista.length;
  return lista[((numeroDoDia(agora) * 7919) % n + n) % n];
}

/** Um da lista ao acaso, evitando repetir o último mostrado. */
export function sortear(lista, anterior = null, aleatorio = Math.random) {
  const opcoes = lista.length > 1 ? lista.filter((r) => r !== anterior) : lista;
  return opcoes[Math.floor(aleatorio() * opcoes.length)];
}

let textos = null;

/**
 * O arquivo gerado pelo script ({ versos, livros }; vazio se ele não existe).
 * Uma busca só por página.
 * @returns {Promise<{versos: Record<string, string>, livros: Record<string, string>}>}
 */
export function carregarTextos() {
  if (!textos) {
    textos = fetch(new URL('../../dados/vigia-versiculos.json', import.meta.url))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => ({
        versos: j && typeof j.versos === 'object' ? j.versos : {},
        livros: j && typeof j.livros === 'object' ? j.livros : {},
      }))
      .catch(() => ({ versos: {}, livros: {} }));
  }
  return textos;
}

/** { ref, legivel, texto (ou ''), link } */
export async function versiculo(ref) {
  const { versos, livros } = await carregarTextos();
  const p = partes(ref);
  const legivel = p && livros[p.livro]
    ? livros[p.livro] + ' ' + p.capitulo + '.' + p.de + (p.ate !== p.de ? '-' + p.ate : '')
    : referenciaLegivel(ref);
  return { ref, legivel, texto: versos[ref] || '', link: linkBibleCom(ref) };
}
