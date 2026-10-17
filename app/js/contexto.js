// contexto.js: o que todas as vistas usam (estado do servidor, livros, dia litúrgico, cor,
// cadeado, gaveta das citações, plano lido e a sincronia com a nova aba).

import { api, dados, ErroApi } from './api.js';
import { h, $, dataHora } from './util.js';
import { diaLiturgico, hoje as hojeN, CORES } from './liturgia.js';
import { criarPlano, juntarComNovaAba, salmoParaAveMaria } from './plano.js';
import * as ponte from './ponte.js';

export const ctx = {
  estado: null,
  livros: [],
  porCodigo: new Map(),
  santos: [],
  versificacao: {},
  hojeLit: null,
  plano: null,
  extensao: null,
  sincroniaNovaAba: { quando: 0, erro: '' },
};

const CORES_CLARAS = { verde: '#9fd0a8', roxo: '#cdb2e8', branco: '#e3c676', vermelho: '#f2a2a5', rosa: '#f2adc6' };
const CORES_TEXTO = { verde: '#ffffff', roxo: '#ffffff', branco: '#ffffff', vermelho: '#ffffff', rosa: '#ffffff' };

export async function carregar() {
  const [estado, livros, santos, versificacao] = await Promise.all([
    api.get('/api/estado'),
    fetch('dados/livros.json').then((r) => r.json()),
    fetch('dados/santos.json').then((r) => r.json()).catch(() => ({ itens: [] })),
    fetch('dados/versificacao.json').then((r) => r.json()).catch(() => ({ salmos: {} })),
  ]);
  ctx.estado = estado;
  ctx.livros = livros.livros;
  ctx.deutero = new Set(livros.deuterocanonicos);
  ctx.porCodigo = new Map(ctx.livros.map((l) => [l[0], { codigo: l[0], nome: l[1], abrev: l[2], testamento: l[3], capitulos: l[4] }]));
  ctx.santos = santos.itens || [];
  ctx.versificacao = versificacao.salmos || {};
  ctx.plano = criarPlano(ctx.livros);
  atualizarDia();
  ponte.extensao().then((v) => { ctx.extensao = v; });
}

export function atualizarDia() {
  ctx.hojeLit = diaLiturgico(hojeN(), ctx.santos);
  aplicarCor(ctx.hojeLit.cor);
}

export function aplicarCor(cor) {
  const raiz = document.documentElement.style;
  raiz.setProperty('--lit', CORES[cor].hex);
  raiz.setProperty('--lit-claro', CORES_CLARAS[cor]);
  raiz.setProperty('--lit-texto', CORES_TEXTO[cor]);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1c1a17');
}

export async function recarregarEstado() {
  ctx.estado = await api.get('/api/estado');
  return ctx.estado;
}

// ── livros e referências ─────────────────────────────────────

export const livro = (c) => ctx.porCodigo.get(c);

/** Salmo da Ave-Maria (grego) -> número hebraico, para mostrar "Salmo 22 (23)". */
export function salmoHebraico(g) {
  if (g <= 8) return String(g);
  if (g === 9) return '9-10';
  if (g <= 112) return String(g + 1);
  if (g === 113) return '114-115';
  if (g === 114 || g === 115) return '116';
  if (g <= 145) return String(g + 1);
  if (g === 146 || g === 147) return '147';
  return String(g);
}

export function nomeDoCapitulo(cod, cap, sigla = 'AM') {
  const l = livro(cod);
  if (!l) return `${cod} ${cap}`;
  if (cod === 'PSA') {
    const h2 = sigla === 'AM' ? salmoHebraico(cap) : String(cap);
    return sigla === 'AM' && h2 !== String(cap) ? `Salmo ${cap} (${h2})` : `Salmo ${cap}`;
  }
  return `${l.nome} ${cap}`;
}

/** 'MAT.5.8-10' -> 'Mt 5,8-10' (o jeito católico de escrever). */
export function refLegivel(ref) {
  const m = /^([1-3]?[A-Z]{2,3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/.exec(ref || '');
  if (!m) return ref;
  const l = livro(m[1]);
  const ab = l ? l.abrev : m[1];
  return `${ab} ${m[2]}` + (m[3] ? `,${m[3]}` + (m[4] ? `-${m[4]}` : '') : '');
}

export async function textoDaRef(ref, sigla = 'AM') {
  const r = await api.get(`/api/biblia/${sigla}/versos?refs=${encodeURIComponent(ref)}`);
  return r.versos[ref] || [];
}

/** A Bíblia escolhida (Ave-Maria se não tem outra). */
export function bibliaEscolhida() {
  const disp = (ctx.estado.biblias || []).map((b) => b.sigla);
  const escolhida = localStorage.getItem('oratorio:biblia');
  return disp.includes(escolhida) ? escolhida : (disp.includes('AM') ? 'AM' : disp[0] || 'AM');
}

// ── plano: capítulos lidos ───────────────────────────────────

export async function lidos({ recarregar = false } = {}) {
  const itens = await dados.listar('lidos', { recarregar });
  return new Set(Object.keys(itens));
}

export async function marcarLidos(refs, valor = true) {
  const itens = {};
  for (const r of refs) itens[r] = valor ? { l: 1 } : null;
  await dados.lote('lidos', itens);
  sincronizarNovaAba().catch(() => {});
}

/** Junta os capítulos lidos com o balão Bíblia da nova aba, nos dois sentidos. */
export async function sincronizarNovaAba() {
  if (!(await ponte.extensao())) return { ok: false, motivo: 'sem-extensao' };
  try {
    const [daExtensao, aqui, config] = await Promise.all([ponte.bibliaNovaAba.ler(), lidos({ recarregar: true }), dados.listar('config')]);
    const visto = config.novaAbaVisto && Array.isArray(config.novaAbaVisto.refs) ? config.novaAbaVisto.refs : null;
    const r = juntarComNovaAba(aqui, daExtensao.lidos, visto, ctx.livros);
    const mudancas = {};
    r.marcar.forEach((ref) => { mudancas[ref] = { l: 1 }; });
    r.desmarcar.forEach((ref) => { mudancas[ref] = null; });
    if (Object.keys(mudancas).length) await dados.lote('lidos', mudancas);
    if (JSON.stringify(r.novaAba) !== JSON.stringify(daExtensao.lidos)) await ponte.bibliaNovaAba.gravar(r.novaAba);
    await dados.gravar('config', 'novaAbaVisto', { refs: r.visto, quando: Date.now() });
    ctx.sincroniaNovaAba = { quando: Date.now(), erro: '', trouxe: r.marcar.length, tirou: r.desmarcar.length };
    return { ok: true, ...ctx.sincroniaNovaAba };
  } catch (erro) {
    ctx.sincroniaNovaAba = { quando: Date.now(), erro: erro.message };
    return { ok: false, motivo: erro.message };
  }
}

// ── o Vigia ──────────────────────────────────────────────────

/**
 * Com o cadeado aberto e a extensão aqui: entrega ao Vigia o que foi registrado em outro
 * aparelho (recaída, vontade vencida) e guarda o retrato do contador para o celular ver.
 */
export async function sincronizarVigia() {
  if (!ctx.estado.portao.aberto || !(await ponte.extensao())) return null;
  const itens = await dados.listar('vigia', { recarregar: true });
  for (const [k, v] of Object.entries(itens)) {
    if (!k.startsWith('pendente:') || !v || v.aplicado) continue;
    try {
      if (v.tipo === 'recair') await ponte.vigia.recair(v.em);
      else if (v.tipo === 'vontade') await ponte.vigia.vontadeVencida(v.em);
      await dados.gravar('vigia', k, { ...v, aplicado: Date.now() });
    } catch { /* tenta de novo na próxima */ }
  }
  const retrato = await ponte.vigia.ler();
  await dados.gravar('vigia', 'retrato', { ...retrato, origem: 'nova-aba' });
  return retrato;
}

// ── cadeado ──────────────────────────────────────────────────

export function trancado() {
  return !ctx.estado.portao.aberto;
}

export function pedirSenha() {
  return new Promise((resolver) => {
    const erro = h('p', { class: 'texto-fraco', role: 'alert' });
    const campo = h('input', { class: 'campo', type: 'password', autocomplete: 'current-password', placeholder: 'Senha', 'aria-label': 'Senha' });
    const dialogo = h('dialog', { class: 'dialogo' },
      h('form', { method: 'dialog', onsubmit: async (e) => {
        e.preventDefault();
        erro.textContent = '';
        try {
          await api.post('/api/portao/destravar', { senha: campo.value });
          await recarregarEstado();
          dialogo.close();
          resolver(true);
        } catch (falha) {
          erro.textContent = falha instanceof ErroApi ? falha.message : 'Não deu para destravar.';
          campo.select();
        }
      } },
      h('p', { class: 'rotulo' }, 'Cadeado'),
      h('h2', { style: 'font-size:1.6rem;margin:.4rem 0 1rem' }, 'Digite a senha'),
      campo, erro,
      h('div', { class: 'dialogo__acoes' },
        h('button', { class: 'botao botao--fantasma', type: 'button', onclick: () => { dialogo.close(); resolver(false); } }, 'Cancelar'),
        h('button', { class: 'botao', type: 'submit' }, 'Destravar'))));
    dialogo.addEventListener('close', () => setTimeout(() => dialogo.remove(), 50));
    document.body.append(dialogo);
    dialogo.showModal();
    campo.focus();
  });
}

/** Bloco padrão de "isto está trancado", com o botão de destravar que recarrega a vista. */
export function avisoTrancado(texto, aoAbrir) {
  return h('div', { class: 'aviso' },
    h('p', null, texto),
    h('p', { style: 'margin-top:.8rem' }, h('button', { class: 'botao', type: 'button', onclick: async () => { if (await pedirSenha()) aoAbrir(); } }, 'Digitar a senha')));
}

// ── gaveta: o texto de um § ou de um trecho da Bíblia ─────────

export async function abrirGaveta(tipo, valor) {
  const gaveta = $('#gaveta');
  const corpo = $('#gavetaCorpo');
  const titulo = $('#gavetaTitulo');
  corpo.replaceChildren(h('span', { class: 'carregando' }, 'Abrindo'));
  gaveta.dataset.aberta = '';
  gaveta.setAttribute('aria-hidden', 'false');
  $('#fundoGaveta').dataset.aberta = '';
  try {
    if (tipo === 'cic') {
      titulo.textContent = `Catecismo § ${valor}`;
      const p = await api.get('/api/catecismo/' + valor);
      corpo.replaceChildren(
        h('p', { class: 'rotulo' }, (p.secao || []).slice(-2).join(' · ')),
        ...p.vizinhos.map((v) => h('div', { class: v.n === p.n ? 'par' : 'par par--vizinho' }, h('b', null, `${v.n}. `), v.texto)),
        h('p', null, h('a', { href: `#/catecismo/${p.n}`, onclick: fecharGaveta }, 'Abrir no Catecismo')),
      );
    } else {
      titulo.textContent = refLegivel(valor);
      const versos = await textoDaRef(valor);
      const [cod, cap] = valor.split('.');
      corpo.replaceChildren(
        h('p', { class: 'escritura' }, versos.length ? versos.map((v) => [h('span', { class: 'v' }, v.v), v.texto, ' ']) : 'Trecho não encontrado na Ave-Maria.'),
        h('p', { class: 'citacao__ref' }, 'Bíblia Ave-Maria'),
        h('p', null, h('a', { href: `#/biblia/${cod}/${cap}`, onclick: fecharGaveta }, 'Abrir o capítulo')),
      );
    }
  } catch (erro) {
    corpo.replaceChildren(h('p', { class: 'aviso' }, erro.message));
  }
  $('#gavetaFechar').focus();
}

export function fecharGaveta() {
  delete $('#gaveta').dataset.aberta;
  $('#gaveta').setAttribute('aria-hidden', 'true');
  delete $('#fundoGaveta').dataset.aberta;
}

/** Texto com {cic:1415} e {bib:MAT.5.8} vira nós com os links que abrem a gaveta. */
export function comCitacoes(texto) {
  const partes = [];
  let resto = String(texto);
  const re = /\{(cic|bib):([^}]+)\}/;
  let m;
  while ((m = re.exec(resto))) {
    if (m.index) partes.push(resto.slice(0, m.index));
    const [, tipo, valor] = m;
    partes.push(h('button', { class: 'ref', type: 'button', onclick: () => abrirGaveta(tipo, valor) }, tipo === 'cic' ? `CIC ${valor}` : refLegivel(valor)));
    resto = resto.slice(m.index + m[0].length);
  }
  if (resto) partes.push(resto);
  return partes;
}

// ── avisos ───────────────────────────────────────────────────

let timerToast = null;
export function toast(texto) {
  const t = $('#toast');
  t.textContent = texto;
  t.dataset.visivel = '';
  clearTimeout(timerToast);
  timerToast = setTimeout(() => delete t.dataset.visivel, 3200);
}

export function quandoFoi(ms) {
  return ms ? dataHora(ms) : 'nunca';
}

export { salmoParaAveMaria };
