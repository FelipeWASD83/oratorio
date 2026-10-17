// vistas/catecismo.js: buscar no Catecismo e ler por parágrafo.
// Rotas: #/catecismo (início), #/catecismo?q=... (busca), #/catecismo/1857 (um § e os vizinhos).

import { h, escapar, semAcento } from '../util.js';
import { api } from '../api.js';
import { ctx } from '../contexto.js';

const PARTES = [
  { nome: 'Prólogo', de: 1, ate: 25 },
  { nome: 'A profissão da fé', de: 26, ate: 1065, detalhe: 'O Credo: Deus, a criação, Jesus Cristo, o Espírito Santo, a Igreja, a vida eterna.' },
  { nome: 'A celebração do mistério cristão', de: 1066, ate: 1690, detalhe: 'A liturgia e os sete sacramentos.' },
  { nome: 'A vida em Cristo', de: 1691, ate: 2557, detalhe: 'A moral: liberdade, consciência, virtudes, pecado, graça e os dez mandamentos.' },
  { nome: 'A oração cristã', de: 2558, ate: 2865, detalhe: 'A oração e o Pai-Nosso.' },
];
const ATALHOS = [
  ['O pecado mortal e o venial', 1854], ['Os dez mandamentos', 2052], ['A confissão', 1422], ['A Eucaristia', 1322],
  ['Os preceitos da Igreja', 2041], ['A castidade', 2337], ['A oração', 2558], ['O Pai-Nosso', 2759],
];

export async function render(rota) {
  if (!ctx.estado.catecismo) {
    return { titulo: 'Catecismo', secoes: [
      h('section', { class: 'cabeca' }, h('div', { class: 'miolo' }, h('p', { class: 'rotulo' }, 'A Palavra'), h('h1', null, 'Catecismo'))),
      h('section', null, h('div', { class: 'miolo miolo--estreito leitura' }, h('p', { class: 'aviso' }, 'O Catecismo ainda não foi baixado neste aparelho. No PC, rode: python ferramentas\\baixar_catecismo.py'))),
    ] };
  }
  const n = Number(rota.args[0]);
  if (n) return paragrafo(n);
  return busca(rota.query.get('q') || '');
}

function formulario(q) {
  return h('form', { class: 'linha-campo', style: 'margin-top:1.4rem;max-width:40rem', onsubmit: (e) => {
    e.preventDefault();
    const t = e.target.q.value.trim();
    if (/^\s*§?\s*\d{1,4}\s*$/.test(t)) location.hash = `#/catecismo/${t.replace(/\D/g, '')}`;
    else if (t) location.hash = `#/catecismo?q=${encodeURIComponent(t)}`;
  } },
  h('input', { class: 'campo', name: 'q', value: q, placeholder: 'Assunto (ex.: mentira, jejum, purgatório) ou número do §', 'aria-label': 'Buscar no Catecismo' }),
  h('button', { class: 'botao', type: 'submit' }, 'Buscar'));
}

async function busca(q) {
  const r = q ? await api.get(`/api/catecismo/busca?q=${encodeURIComponent(q)}`) : { resultados: [] };
  const termos = (semAcento(q).match(/[a-z]{3,}/g) || []).map((t) => t.slice(0, Math.max(4, t.length - 2)));
  const realce = (texto) => {
    let html = escapar(texto.length > 600 ? texto.slice(0, 600) + '…' : texto);
    for (const t of termos) html = html.replace(new RegExp(`(${t.split('').map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\u0300-\\u036f]?')}[a-zà-ú]*)`, 'gi'), '<mark>$1</mark>');
    return html;
  };
  return { titulo: 'Catecismo', secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'A Palavra · Catecismo da Igreja Católica'),
      h('h1', null, q ? `"${q}"` : 'Catecismo'),
      h('p', { class: 'cabeca__sub' }, q ? `${r.resultados.length} parágrafos mais ligados ao assunto` : '2.865 parágrafos, do texto do vatican.va. É a base principal das respostas da IA.'),
      formulario(q))),
    h('section', null, h('div', { class: 'miolo miolo--estreito' },
      q
        ? (r.resultados.length ? h('ul', { class: 'lista-limpa divisor resultados' }, r.resultados.map((p) => h('li', null,
          h('a', { href: `#/catecismo/${p.n}` }, `§ ${p.n}`), h('span', { class: 'texto-fraco', style: 'font-size:.85rem' }, ' · ', p.secao.slice(-2).join(' · ')),
          h('p', { class: 'cic-texto', html: realce(p.texto) })))) : h('p', { class: 'texto-fraco' }, 'Nada encontrado. Tente outra palavra (o Catecismo usa o português de Portugal: "facto", "acto", "baptismo").'))
        : h('div', null, h('p', { class: 'rotulo' }, 'Por onde começar'),
          h('div', { class: 'cabeca__acoes' }, ATALHOS.map(([nome, num]) => h('a', { class: 'chip chip--lit', href: `#/catecismo/${num}` }, nome)))))),
    h('section', null, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'As quatro partes'),
      h('div', { class: 'grade' }, PARTES.map((p) => h('a', { class: 'cartao', href: `#/catecismo/${p.de}` },
        h('p', { class: 'rotulo rotulo--lit' }, `§ ${p.de} a ${p.ate}`), h('h3', null, p.nome), p.detalhe ? h('p', { class: 'texto-fraco' }, p.detalhe) : null))))),
    h('section', null, h('div', { class: 'miolo miolo--estreito' }, h('p', { class: 'texto-fraco' }, 'Texto da Libreria Editrice Vaticana, baixado do vatican.va para uso pessoal (fica só neste aparelho e no servidor de casa). Os parágrafos 2217 e 2439 não aparecem porque, no próprio site, estão colados aos vizinhos.'))),
  ] };
}

async function paragrafo(n) {
  let trecho;
  try {
    trecho = await api.get(`/api/catecismo/trecho?de=${Math.max(1, n - 3)}&ate=${n + 6}`);
  } catch (erro) {
    return busca('');
  }
  const atual = trecho.paragrafos.find((p) => p.n === n) || trecho.paragrafos[0];
  const parte = PARTES.find((p) => n >= p.de && n <= p.ate);
  return { titulo: `Catecismo § ${n}`, secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, h('a', { href: '#/catecismo', style: 'color:inherit' }, 'Catecismo'), parte ? ` · ${parte.nome}` : ''),
      h('h1', null, `§ ${n}`),
      h('p', { class: 'cabeca__sub' }, (atual?.secao || []).slice(1).join(' · ')),
      h('div', { class: 'cabeca__acoes' },
        n > 1 ? h('a', { class: 'botao botao--fantasma botao--pequeno', href: `#/catecismo/${n - 1}` }, `← § ${n - 1}`) : null,
        n < 2865 ? h('a', { class: 'botao botao--fantasma botao--pequeno', href: `#/catecismo/${n + 1}` }, `§ ${n + 1} →`) : null),
      formulario(''))),
    h('section', null, h('div', { class: 'miolo miolo--estreito' },
      trecho.paragrafos.map((p) => h('article', { class: 'cic-par' + (p.n === n ? ' cic-par--atual' : ''), id: 'p' + p.n },
        h('a', { class: 'cic-par__n', href: `#/catecismo/${p.n}` }, p.n),
        h('div', { class: 'cic-par__texto' }, p.texto.split('\n').map((l) => h('p', null, l))))))),
  ], depois: () => document.getElementById('p' + n)?.scrollIntoView({ block: 'start' }) };
}
