// vistas/hoje.js: o dia litúrgico, o versículo, a leitura de hoje, o terço do dia, os dias limpo e os atalhos.

import { h, plural } from '../util.js';
import { ctx, refLegivel, textoDaRef, lidos, marcarLidos, nomeDoCapitulo, trancado, pedirSenha } from '../contexto.js';
import { dados } from '../api.js';
import { dataPorExtenso, diaLiturgico, partes } from '../liturgia.js';
import { versoParaAveMaria } from '../plano.js';
import { DO_DIA, doDia } from '../../vendor/vigia/versiculos.js';
import { misteriosDoDia } from '../conteudo/oracoes.js';
import { GUIAS } from '../conteudo/guias.js';
import { reRender } from '../main.js';
import { cartaoLimpo } from './limpo.js';

const LITURGIA_DIARIA = 'https://www.cnbb.org.br/liturgia-diaria/';
const GRAU = { solenidade: 'Solenidade', solenidadePropria: 'Solenidade', festa: 'Festa', festaDoSenhor: 'Festa do Senhor', memoria: 'Memória', facultativa: 'Memória facultativa', privilegiado: '', triduo: 'Tríduo Pascal', domingo: '', feria: '' };

export async function render() {
  const d = ctx.hojeLit;
  return { titulo: 'Hoje', secoes: [cabeca(d), await meio(d), atalhos(), await proximos(d)] };
}

function cabeca(d) {
  const grau = GRAU[d.grau] || '';
  const outras = d.outras.filter((o) => o.nome !== d.nome);
  return h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Hoje · ', dataPorExtenso(d.n)),
    h('h1', { style: 'margin-top:.6rem' }, d.nome),
    h('p', { class: 'cabeca__sub' },
      grau ? `${grau} · ` : '',
      d.tempo === 'comum' || d.tempo === 'advento' || d.tempo === 'quaresma' || d.tempo === 'pascoa'
        ? `${d.semanaTempo ? d.semanaTempo + 'ª semana · ' : ''}${d.nomeTempo}` : d.nomeTempo,
      ` · Ano ${d.ciclo.domingos}, ciclo ${d.ciclo.semana}`),
    outras.length ? h('p', { class: 'texto-fraco', style: 'margin-top:.6rem' }, 'Também hoje: ', outras.map((o) => o.nome + (o.comemoracao ? ' (comemoração)' : '')).join('; ')) : null,
    h('div', { class: 'cabeca__acoes' },
      h('span', { class: 'chip chip--lit' }, h('span', { class: 'bolinha', style: 'background:var(--lit-claro)' }), `Cor do dia: ${d.cor}`),
      d.preceito ? h('span', { class: 'chip' }, 'Dia de preceito: Missa') : null,
      d.jejum ? h('span', { class: 'chip' }, 'Jejum') : null,
      d.abstinencia ? h('span', { class: 'chip' }, d.jejum ? 'Abstinência de carne' : 'Sexta: abstinência ou outra penitência') : null,
      h('a', { class: 'botao botao--linha botao--pequeno', href: LITURGIA_DIARIA, target: '_blank', rel: 'noopener' }, 'Leituras da Missa de hoje (CNBB)'))));
}

async function meio(d) {
  const ref = versoParaAveMaria(doDia(Date.now(), DO_DIA), ctx.versificacao);
  const versos = await textoDaRef(ref).catch(() => []);
  const conjunto = await lidos();
  const plano = ctx.plano;
  const config = await dados.listar('config');
  const ritmo = (config.plano && config.plano.ritmo) || 2;
  const hj = partes(d.n);
  const diaTexto = `${hj.ano}-${String(hj.mes).padStart(2, '0')}-${String(hj.dia).padStart(2, '0')}`;
  let leitura = plano.leituraDeHoje(conjunto, ritmo, config.hoje, diaTexto);
  if (!config.hoje || config.hoje.dia !== diaTexto) dados.gravar('config', 'hoje', leitura).catch(() => {});
  const [chave, misterios] = misteriosDoDia(partes(d.n).semana);

  const lista = h('ul', { class: 'lista-limpa divisor' }, leitura.itens.map((item) => {
    const [cod, cap] = item.ref.split('.');
    const feito = conjunto.has(item.ref);
    const caixa = h('input', { type: 'checkbox', checked: feito, 'aria-label': 'Marcar como lido', onchange: async (e) => { await marcarLidos([item.ref], e.target.checked); } });
    return h('li', { style: 'display:flex;gap:.7rem;align-items:center;padding:.55rem 0' }, caixa,
      h('a', { href: `#/biblia/${cod}/${cap}`, style: feito ? 'text-decoration:line-through;opacity:.6' : '' }, nomeDoCapitulo(cod, Number(cap))),
      h('span', { class: 'texto-fraco', style: 'margin-left:auto;font-size:.85rem' }, item.trilha === 'plano' ? 'plano' : item.trilha));
  }));

  return h('section', null, h('div', { class: 'miolo' }, h('div', { class: 'grade' },
    h('article', { class: 'cartao cartao--largo' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Versículo do dia'),
      h('blockquote', { class: 'citacao', style: 'margin:0' }, versos.length ? versos.map((v) => v.texto).join(' ') : 'Baixe a Bíblia para ver o texto (Ajustes).'),
      h('span', { class: 'citacao__ref' }, refLegivel(ref), ' · o mesmo do Vigia'),
      h('div', { class: 'cartao__pe' }, h('a', { class: 'botao botao--linha botao--pequeno', href: `#/biblia/${ref.split('.')[0]}/${ref.split('.')[1]}` }, 'Ler o capítulo'))),
    h('article', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Leitura de hoje'),
      leitura.itens.length ? lista : h('p', null, 'Plano terminado. Que beleza.'),
      h('div', { class: 'cartao__pe' },
        h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', onclick: async () => { leitura = plano.maisUm(conjunto, leitura); await dados.gravar('config', 'hoje', leitura); reRender(); } }, 'Mais um capítulo'),
        h('a', { class: 'botao-texto', href: '#/plano' }, 'Ver o plano'))),
    h('article', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Terço de hoje'),
      h('h3', null, misterios.nome),
      h('ol', { style: 'margin:0;padding-left:1.2rem;color:var(--texto-2)' }, misterios.itens.map((m) => h('li', null, m.nome))),
      h('div', { class: 'cartao__pe' }, h('a', { class: 'botao botao--pequeno', href: `#/terco/${chave}` }, 'Rezar o terço'))),
    await cartaoDoVigia(),
    h('article', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Isso é pecado?'),
      h('p', { class: 'texto-fraco' }, 'Pergunte e a resposta vem do Catecismo, com os parágrafos para você conferir.'),
      h('form', { class: 'linha-campo', onsubmit: (e) => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) location.hash = '#/perguntar?q=' + encodeURIComponent(q); } },
        h('input', { class: 'campo', name: 'q', placeholder: 'Ex.: faltar à missa por preguiça', 'aria-label': 'Pergunta' }),
        h('button', { class: 'botao', type: 'submit' }, 'Perguntar'))),
  )));
}

async function cartaoDoVigia() {
  if (trancado()) {
    return h('article', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Dias limpo'),
      h('p', { class: 'texto-fraco' }, 'Trancado pelo cadeado.'),
      h('div', { class: 'cartao__pe' }, h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', onclick: async () => { if (await pedirSenha()) reRender(); } }, 'Destravar')));
  }
  return cartaoLimpo();
}

function atalhos() {
  const itens = [
    ...GUIAS.map((g) => ({ href: `#/guias/${g.id}`, rotulo: 'Guia', nome: g.nome, texto: g.resumo })),
    { href: '#/colinha', rotulo: 'Confissão', nome: 'Colinha de pecados', texto: 'O exame de consciência pelos mandamentos, para levar ao confessionário.' },
    { href: '#/escrever', rotulo: 'Oração', nome: 'Escrever uma oração', texto: 'Com modelos, dicas enquanto escreve e um revisor de IA.' },
    { href: '#/arvore', rotulo: 'Bíblia', nome: 'Árvore da Bíblia', texto: 'A família de cada pessoa da Bíblia, e quem aparece em cada capítulo.' },
  ];
  return h('section', null, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Caminho'),
    h('h2', { class: 'titulo-secao' }, 'Para quem está começando, ', h('em', null, 'e para quem está voltando')),
    h('div', { class: 'grade' }, itens.map((i) => h('a', { class: 'cartao', href: i.href },
      h('p', { class: 'rotulo rotulo--lit' }, i.rotulo), h('h3', null, i.nome), h('p', { class: 'texto-fraco' }, i.texto))))));
}

async function proximos(d) {
  const dias = [];
  for (let n = d.n + 1; n <= d.n + 14 && dias.length < 6; n++) {
    const x = diaLiturgico(n, ctx.santos);
    if (x.celebracao && ['solenidade', 'solenidadePropria', 'festa', 'festaDoSenhor', 'privilegiado', 'triduo', 'memoria'].includes(x.celebracao.grau)) dias.push(x);
  }
  return h('section', null, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Próximos dias'),
    h('h2', { class: 'titulo-secao' }, 'O que a Igreja celebra ', h('em', null, 'nas próximas duas semanas')),
    dias.length ? h('ul', { class: 'lista-limpa divisor', style: 'max-width:46rem' }, dias.map((x) => h('li', { style: 'display:flex;gap:1rem;align-items:baseline;padding:.7rem 0' },
      h('span', { class: 'bolinha', style: `background:${x.corHex}` }),
      h('span', { style: 'min-width:7.5rem;color:var(--texto-3)' }, `${x.dia}/${String(x.mes).padStart(2, '0')} · ${x.diaSemana.split('-')[0]}`),
      h('span', null, x.nome),
      x.preceito && x.diaSemana !== 'domingo' ? h('span', { class: 'chip', style: 'margin-left:auto' }, 'preceito') : null)))
      : h('p', { class: 'texto-fraco' }, 'Só dias de semana comuns nas próximas duas semanas.'),
    h('p', { style: 'margin-top:1.2rem' }, h('a', { href: '#/calendario' }, 'Ver o calendário inteiro'), ' · ', plural(ctx.santos.length, 'celebração', 'celebrações'), ' no calendário do Brasil')));
}
