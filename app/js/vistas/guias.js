// vistas/guias.js: os guias (primeira vez na igreja, depois da conversão, confissão).
// Cada seção do guia vira um bloco; as citações abrem o texto de verdade na gaveta.

import { h } from '../util.js';
import { comCitacoes } from '../contexto.js';
import { GUIAS } from '../conteudo/guias.js';

export async function render(rota) {
  const g = GUIAS.find((x) => x.id === rota.args[0]);
  if (!g) return indice();
  const i = GUIAS.indexOf(g);
  const secoes = [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, h('a', { href: '#/guias', style: 'color:inherit' }, 'Guias')),
      h('h1', null, g.nome),
      h('p', { class: 'cabeca__sub' }, g.resumo),
      h('div', { class: 'cabeca__acoes' }, g.secoes.map((s, k) => h('a', { class: 'chip', href: `#/guias/${g.id}`, onclick: (e) => { e.preventDefault(); document.getElementById(`secao-${k}`)?.scrollIntoView({ behavior: 'smooth' }); } }, s.titulo))))),
    ...g.secoes.map((s, k) => h('section', { id: `secao-${k}` }, h('div', { class: 'miolo miolo--estreito guia' },
      h('h2', { class: 'titulo-secao' }, s.titulo),
      s.blocos.map(bloco)))),
  ];
  const proximo = GUIAS[(i + 1) % GUIAS.length];
  secoes.push(h('section', null, h('div', { class: 'miolo miolo--estreito' },
    h('p', { class: 'rotulo' }, 'Próximo guia'),
    h('a', { class: 'cartao', href: `#/guias/${proximo.id}`, style: 'margin-top:.6rem' }, h('h3', null, proximo.nome), h('p', { class: 'texto-fraco' }, proximo.resumo)))));
  return { titulo: g.nome, secoes };
}

function indice() {
  return { titulo: 'Guias', secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'Caminho'),
      h('h1', null, 'Guias'),
      h('p', { class: 'cabeca__sub' }, 'O passo a passo, com o Catecismo do lado de cada afirmação.'))),
    h('section', null, h('div', { class: 'miolo' }, h('div', { class: 'grade grade--larga' },
      GUIAS.map((g) => h('a', { class: 'cartao', href: `#/guias/${g.id}` }, h('p', { class: 'rotulo rotulo--lit' }, `${g.secoes.length} partes`), h('h3', null, g.nome), h('p', { class: 'texto-fraco' }, g.resumo))),
      h('a', { class: 'cartao', href: '#/colinha' }, h('p', { class: 'rotulo rotulo--lit' }, 'Ferramenta'), h('h3', null, 'Colinha de pecados'), h('p', { class: 'texto-fraco' }, 'O exame de consciência para levar à confissão.')),
      h('a', { class: 'cartao', href: '#/perguntar' }, h('p', { class: 'rotulo rotulo--lit' }, 'Ferramenta'), h('h3', null, 'Isso é pecado?'), h('p', { class: 'texto-fraco' }, 'A dúvida concreta, respondida pelo Catecismo.'))))),
  ] };
}

function bloco(b) {
  if (b.p) return h('p', { class: 'guia__p' }, comCitacoes(b.p));
  if (b.aviso) return h('p', { class: 'aviso' }, comCitacoes(b.aviso));
  if (b.lista) return h('ul', { class: 'guia__lista' }, b.lista.map((t) => h('li', null, comCitacoes(t))));
  if (b.passos) return h('ol', { class: 'guia__passos' }, b.passos.map((t) => h('li', null, comCitacoes(t))));
  if (b.missa) return h('div', { class: 'missa' }, b.missa.map((etapa) => h('div', { class: 'missa__etapa' },
    h('div', { class: 'missa__cabeca' }, h('h3', null, etapa.parte), h('span', { class: 'chip' }, etapa.postura)),
    h('ol', { class: 'lista-limpa missa__itens' }, etapa.itens.map((it) => h('li', { class: 'missa__item' },
      it.o ? h('p', null, comCitacoes(it.o)) : null,
      it.texto ? h('p', { class: 'missa__texto' }, it.texto) : null,
      it.padre ? h('p', { class: 'missa__fala' }, h('span', { class: 'missa__quem' }, it.quem || 'Padre'), it.padre) : null,
      it.povo ? h('p', { class: 'missa__fala missa__fala--povo' }, h('span', { class: 'missa__quem' }, 'Todos'), it.povo) : null,
      it.nota ? h('p', { class: 'texto-fraco missa__nota' }, it.nota) : null))))));
  return null;
}
