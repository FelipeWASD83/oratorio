// main.js: liga tudo. Rotas por hash (#/biblia/GEN/1), a casca e a alternância dos blocos.
//
// Cada vista devolve { titulo, secoes: [elementos], semRodape?, depois? }. Quem decide o
// fundo é daqui: a primeira seção é escura (a cabeça), e elas se alternam; o rodapé fica
// com o tom contrário ao da última. Assim nenhuma vista repete fundo sem querer.

import { h, $, $$ } from './util.js';
import { dados } from './api.js';
import { ctx, carregar, fecharGaveta, recarregarEstado, atualizarDia } from './contexto.js';

const VISTAS = {
  hoje: () => import('./vistas/hoje.js'),
  biblia: () => import('./vistas/biblia.js'),
  busca: () => import('./vistas/biblia.js'),
  plano: () => import('./vistas/plano.js'),
  oracoes: () => import('./vistas/oracoes.js'),
  terco: () => import('./vistas/terco.js'),
  escrever: () => import('./vistas/escrever.js'),
  perguntar: () => import('./vistas/perguntar.js'),
  catecismo: () => import('./vistas/catecismo.js'),
  calendario: () => import('./vistas/calendario.js'),
  guias: () => import('./vistas/guias.js'),
  colinha: () => import('./vistas/embutidos.js'),
  arvore: () => import('./vistas/embutidos.js'),
  limpo: () => import('./vistas/limpo.js'),
  ajustes: () => import('./vistas/ajustes.js'),
};

let renderizando = 0;

function lerRota() {
  const bruto = location.hash.replace(/^#\/?/, '') || 'hoje';
  const [caminho, busca] = bruto.split('?');
  const partes = caminho.split('/').filter(Boolean).map(decodeURIComponent);
  const nome = VISTAS[partes[0]] ? partes[0] : 'hoje';
  return { nome, args: partes.slice(1), query: new URLSearchParams(busca || '') };
}

async function render(opcoes = {}) {
  const vez = ++renderizando;
  const rolagem = window.scrollY;
  const rota = lerRota();
  fecharGaveta();
  document.getElementById('app').removeAttribute('data-menu');
  marcarNav(rota.nome);
  let resultado;
  try {
    const modulo = await VISTAS[rota.nome]();
    resultado = await modulo.render(rota);
  } catch (erro) {
    console.error(erro);
    resultado = { titulo: 'Erro', secoes: [h('section', { class: 'cabeca' }, h('div', { class: 'miolo' }, h('p', { class: 'rotulo' }, 'Algo deu errado'), h('h1', null, 'Não deu para abrir esta parte'), h('p', { class: 'cabeca__sub' }, String(erro.message || erro))))] };
  }
  if (vez !== renderizando) return;   // outra rota foi pedida enquanto esta carregava
  montar(resultado);
  document.title = resultado.titulo ? `${resultado.titulo} · Oratório` : 'Oratório';
  window.scrollTo({ top: opcoes.manter ? rolagem : 0 });
  if (resultado.depois) resultado.depois();
}

function montar({ secoes, semRodape }) {
  const vista = $('#vista');
  secoes.forEach((s, i) => {
    s.classList.add('bloco', i % 2 === 0 ? 'bloco--escuro' : 'bloco--claro');
    if (i === 0 && !s.querySelector('.fita') && s.classList.contains('cabeca')) s.append(h('div', { class: 'fita', 'aria-hidden': 'true' }));
  });
  vista.replaceChildren(...secoes);
  const rodape = $('#rodape');
  rodape.hidden = !!semRodape;
  rodape.className = 'rodape ' + (secoes.length % 2 === 0 ? 'rodape--escuro' : 'rodape--claro');
}

function marcarNav(nome) {
  const ativo = nome === 'busca' ? 'biblia' : nome;
  $$('[data-rota]').forEach((a) => {
    if (a.dataset.rota === ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function desenharCasca() {
  const d = ctx.hojeLit;
  const dia = $('#lateralDia');
  dia.querySelector('b').textContent = d.nome;
  dia.querySelector('span').replaceChildren(h('span', { class: 'bolinha', style: 'margin-right:.4rem;background:var(--lit-claro)' }), `${d.nomeTempo} · ${d.cor}`);
  $('#navCadeado').textContent = ctx.estado.portao.tipo === 'nenhum' ? '' : ctx.estado.portao.aberto ? 'aberto' : 'trancado';
  const pe = $('#lateralPe');
  const s = ctx.estado.sincronia;
  pe.replaceChildren(
    h('span', null, `Versão ${ctx.estado.versao}${ctx.estado.modo === 'demo' ? ' · demonstração' : ''}`),
    s.ligada ? h('span', null, s.ok === false ? 'Sincronia: servidor de casa fora' : 'Sincronia com o servidor de casa ligada') : null,
    ctx.estado.portao.tipo !== 'nenhum' && ctx.estado.portao.aberto
      ? h('button', { type: 'button', onclick: async () => { await fetch('/api/portao/trancar', { method: 'POST' }); await recarregarEstado(); desenharCasca(); render(); } }, 'Trancar agora')
      : null,
  );
  $('#rodape').replaceChildren(h('div', { class: 'miolo' },
    h('span', null, 'Oratório: Bíblia Ave-Maria e Catecismo da Igreja Católica (texto do vatican.va), para uso pessoal.'),
    h('span', null, 'Calendário pelo romcal (MIT) · ', h('a', { href: '#/ajustes' }, 'fontes e licenças'))));
}

async function iniciar() {
  try {
    await carregar();
  } catch (erro) {
    $('#vista').replaceChildren(h('section', { class: 'bloco bloco--escuro cabeca' }, h('div', { class: 'miolo' },
      h('h1', null, 'O servidor do Oratório não respondeu'), h('p', { class: 'cabeca__sub' }, String(erro.message || erro)))));
    return;
  }
  desenharCasca();
  window.addEventListener('hashchange', () => render());
  $('#botaoMais').addEventListener('click', () => document.getElementById('app').toggleAttribute('data-menu'));
  document.getElementById('app').addEventListener('click', (e) => {
    if (e.target === document.getElementById('app')) document.getElementById('app').removeAttribute('data-menu');
  });
  $('#gavetaFechar').addEventListener('click', fecharGaveta);
  $('#fundoGaveta').addEventListener('click', fecharGaveta);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharGaveta(); });
  await render();
  // A extensão da nova aba mexe nos dados em segundo plano (Vigia e plano): de minuto em minuto, se a vista
  // for uma das que mostram isso, redesenha sem voltar ao topo, mas só quando a extensão sincronizou de novo.
  let ultimaPonte = (ctx.estado.ponte && ctx.estado.ponte.quando) || 0;
  setInterval(async () => {
    if (document.hidden || !['hoje', 'plano', 'limpo'].includes(lerRota().nome)) return;
    try {
      const e = await recarregarEstado();
      const q = (e.ponte && e.ponte.quando) || 0;
      if (q > ultimaPonte) {
        ultimaPonte = q;
        dados.esquecer();
        render({ manter: true });
      }
    } catch { /* servidor fora: a próxima volta tenta */ }
  }, 20000);
  // Virou o dia com a página aberta: recalcula a cor e o dia litúrgico.
  let diaAtual = ctx.hojeLit.n;
  setInterval(() => {
    atualizarDia();
    if (ctx.hojeLit.n !== diaAtual) { diaAtual = ctx.hojeLit.n; desenharCasca(); render(); }
  }, 60000);
  window.__oratorio = { ctx, render };
}

/** Redesenha a vista atual sem voltar ao topo (depois de marcar, salvar...). */
export function reRender() { return render({ manter: true }); }
export function redesenharCasca() { desenharCasca(); }

iniciar();
