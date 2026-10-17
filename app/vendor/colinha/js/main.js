// Interface: monta a página a partir de dados/pecados.js e liga tudo ao estado.

import {
  SECOES, GRAVIDADE, CAPITAIS, CONDICOES, CAPITAIS_REF, BRADAM_REF, ESPIRITO_SANTO_REF,
  CONFISSAO_PASSOS, ATO_DE_CONTRICAO, todosOsItens,
} from '../dados/pecados.js';
import { criarEstado, MAX_VEZES, MAX_NOTA, MAX_ULTIMA } from './estado.js';
import { marcados, resumir } from './resumo.js';
import { baixarPdf, baixarPng } from './exportar.js';
import { semAcento } from './util.js';

const ITENS = todosOsItens();

function armazemDoNavegador() {
  try {
    const teste = '__colinha_teste__';
    window.localStorage.setItem(teste, '1');
    window.localStorage.removeItem(teste);
    return window.localStorage;
  } catch {
    return null; // janela privada ou dados bloqueados: funciona, mas não guarda
  }
}

// Quem embute a colinha pode dar o armazém dele (o Oratório guarda no servidor, atrás do cadeado).
const estado = criarEstado(globalThis.colinhaArmazem ?? armazemDoNavegador(), new Set(ITENS.map((i) => i.id)));

// ---------- helper de DOM ----------
function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props ?? {})) {
    if (valor == null || valor === false) continue;
    if (chave === 'class') el.className = valor;
    else if (chave === 'dataset') Object.assign(el.dataset, valor);
    else if (chave.startsWith('on')) el.addEventListener(chave.slice(2), valor);
    else if (chave in el && chave !== 'list') el[chave] = valor;
    else el.setAttribute(chave, valor === true ? '' : valor);
  }
  for (const filho of filhos.flat(Infinity)) {
    if (filho == null || filho === false) continue;
    el.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

const $ = (seletor) => document.querySelector(seletor);

const SVG_CHECK =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 10.8 8 15.2 16.6 5"/></svg>';

// ---------- referências estáticas (blocos de leitura) ----------
function montarLeitura() {
  $('#qtdItens').textContent = ITENS.length;
  $('#condicoes').append(
    ...CONDICOES.map((c) =>
      h('li', { class: 'condicao' },
        h('span', { class: 'condicao__n', 'aria-hidden': 'true' }, c.n),
        h('h3', null, c.titulo),
        h('p', null, c.texto),
        h('p', { class: 'condicao__cic' }, `Catecismo, ${c.cic}`)),
    ),
  );
  $('#passos').append(...CONFISSAO_PASSOS.map((p) => h('li', null, h('span', null, p))));
  $('#contricao').textContent = ATO_DE_CONTRICAO;
  $('#capitais').append(
    ...CAPITAIS_REF.flatMap(([nome, texto]) => [h('dt', null, nome), h('dd', null, texto)]),
  );
  $('#bradam').append(...BRADAM_REF.map((t) => h('li', null, t)));
  $('#espirito').append(...ESPIRITO_SANTO_REF.map((t) => h('li', null, t)));
}

// ---------- a lista ----------
const refs = new Map(); // id do item -> { li, input, extra, vezes, obs, texto }
const refsSecao = new Map(); // id da seção -> { el, grupos: [{el, itens:[id]}] }

function etiquetaGravidade(g) {
  return h('span', { class: `tag-${g}` }, GRAVIDADE[g].rotulo);
}

function montarItem(item) {
  const marcado = estado.marcado(item.id);
  const input = h('input', {
    class: 'item__input',
    type: 'checkbox',
    checked: marcado,
    id: `chk-${item.id}`,
    onchange: () => estado.alternar(item.id, input.checked),
  });
  const caixa = h('span', { class: 'item__caixa', 'aria-hidden': 'true' });
  caixa.innerHTML = SVG_CHECK;

  const meta = h('span', { class: 'item__meta' },
    etiquetaGravidade(item.g),
    h('span', null, `CIC ${item.c.join(', ')}`),
    (item.k ?? []).map((k) => h('span', { class: 'tag-k' }, CAPITAIS[k])),
  );

  const rotulo = h('label', { class: 'item__rotulo', for: `chk-${item.id}` },
    input,
    caixa,
    h('span', { class: 'item__texto' },
      item.t,
      item.n ? h('span', { class: 'item__nota' }, item.n) : null,
      meta),
  );

  const vezes = h('output', { 'aria-live': 'polite' });
  const menos = h('button', { type: 'button', 'aria-label': 'Menos uma vez', onclick: () => mudarVezes(item.id, -1) }, '−');
  const mais = h('button', { type: 'button', 'aria-label': 'Mais uma vez', onclick: () => mudarVezes(item.id, +1) }, '+');
  const obs = h('input', {
    class: 'obs',
    type: 'text',
    maxLength: MAX_NOTA,
    placeholder: 'Detalhe para dizer ao padre (opcional)',
    'aria-label': `Observação sobre: ${item.t}`,
    oninput: () => estado.definirNota(item.id, obs.value),
  });
  const extra = h('div', { class: 'item__extra', hidden: !marcado },
    h('div', { class: 'vezes', role: 'group', 'aria-label': 'Quantas vezes' }, menos, vezes, mais),
    obs,
  );

  const li = h('li', { class: 'item', dataset: { g: item.g, id: item.id } }, rotulo, extra);
  refs.set(item.id, { li, input, extra, vezes, obs, item });
  return li;
}

function mudarVezes(id, delta) {
  const atual = estado.marca(id)?.n ?? 1;
  estado.definirVezes(id, Math.min(MAX_VEZES, Math.max(1, atual + delta)));
}

function montarExame() {
  const raiz = $('#exame');
  const indice = h('ol');

  for (const secao of SECOES) {
    const grupos = [];
    let grupoAtual = null;
    for (const item of secao.itens) {
      if (item.grupo || !grupoAtual) {
        grupoAtual = { titulo: item.grupo ?? null, itens: [], ul: h('ul', { class: 'itens' }), cab: null };
        if (item.grupo) grupoAtual.cab = h('h4', { class: 'grupo__titulo' }, item.grupo);
        grupos.push(grupoAtual);
      }
      grupoAtual.itens.push(item.id);
      grupoAtual.ul.append(montarItem(item));
    }

    const el = h('section', { class: 'mand', id: `sec-${secao.id}`, 'aria-labelledby': `tit-${secao.id}`, dataset: { secao: secao.id } },
      h('header', { class: 'mand__cab' },
        h('span', { class: 'mand__num', 'aria-hidden': 'true' }, secao.num),
        h('h3', { class: 'mand__titulo', id: `tit-${secao.id}` },
          secao.num.length <= 3 ? h('span', { class: 'sr-so' }, `${secao.num} mandamento: `) : null,
          secao.titulo),
        h('p', { class: 'mand__resumo' }, secao.resumo),
        h('p', { class: 'mand__cic' }, `Catecismo, ${secao.cic}`)),
      grupos.map((g) => [g.cab, g.ul]),
    );
    refsSecao.set(secao.id, { el, grupos });
    raiz.append(el);

    indice.append(
      h('li', null,
        h('a', { href: `#sec-${secao.id}`, dataset: { secao: secao.id } },
          h('span', { class: 'indice__num' }, secao.num),
          h('span', { class: 'indice__nome' }, secao.titulo),
          h('span', { class: 'indice__qtd', dataset: { qtd: secao.id } }))),
    );
  }
  $('#indice').append(h('p', { class: 'indice__rotulo' }, 'Mandamentos'), indice);
}

// ---------- filtros ----------
const filtro = { texto: '', modo: 'todos' };

function passaNoFiltro(item) {
  if (filtro.modo === 'marcados' && !estado.marcado(item.id)) return false;
  if (['g', 'd', 'l'].includes(filtro.modo) && item.g !== filtro.modo) return false;
  if (filtro.texto) {
    const base = semAcento(`${item.t} ${item.n ?? ''}`);
    return filtro.texto.split(/\s+/).every((p) => base.includes(p));
  }
  return true;
}

function aplicarFiltro() {
  let visiveis = 0;
  for (const secao of SECOES) {
    const refSecao = refsSecao.get(secao.id);
    let naSecao = 0;
    for (const grupo of refSecao.grupos) {
      let noGrupo = 0;
      for (const id of grupo.itens) {
        const { li, item } = refs.get(id);
        const mostrar = passaNoFiltro(item);
        li.hidden = !mostrar;
        if (mostrar) noGrupo += 1;
      }
      if (grupo.cab) grupo.cab.hidden = noGrupo === 0;
      grupo.ul.hidden = noGrupo === 0;
      naSecao += noGrupo;
    }
    refSecao.el.hidden = naSecao === 0;
    visiveis += naSecao;
  }
  $('#vazio').hidden = visiveis !== 0;
  const filtrando = filtro.texto || filtro.modo !== 'todos';
  $('#statusFiltro').textContent = filtrando ? `Mostrando ${visiveis} de ${ITENS.length} itens.` : '';
}

// ---------- atualização depois de qualquer mudança ----------
function atualizar() {
  const total = resumir(SECOES, estado);

  for (const [id, ref] of refs) {
    const marcado = estado.marcado(id);
    ref.li.classList.toggle('is-marcado', marcado);
    if (ref.input.checked !== marcado) ref.input.checked = marcado;
    ref.extra.hidden = !marcado;
    if (marcado) {
      const marca = estado.marca(id);
      ref.vezes.textContent = marca.n === 1 ? '1 vez' : `${marca.n} vezes`;
      if (document.activeElement !== ref.obs && ref.obs.value !== marca.nota) ref.obs.value = marca.nota;
    }
  }

  for (const el of document.querySelectorAll('[data-qtd]')) {
    const n = total.porSecao[el.dataset.qtd] ?? 0;
    el.textContent = n ? String(n) : '';
  }

  $('#cG').textContent = total.g;
  $('#cD').textContent = total.d;
  $('#cL').textContent = total.l;
  $('#barraQtd').textContent = total.todos;
  for (const botao of document.querySelectorAll('[data-exportar]')) botao.disabled = total.todos === 0;
  $('#avisoArmazem').hidden = estado.persistente;

  const campo = $('#ultima');
  if (document.activeElement !== campo && campo.value !== estado.ultima) campo.value = estado.ultima;

  montarListaViva();
}

function montarListaViva() {
  const raiz = $('#listaViva');
  const lista = marcados(SECOES, estado);
  raiz.replaceChildren();
  if (!lista.length) {
    raiz.append(h('p', { class: 'folha-viva__vazio' }, 'Nada marcado ainda. Marque os itens do exame e eles aparecem aqui.'));
    return;
  }
  let secaoAtual = null;
  for (const item of lista) {
    if (item.secaoId !== secaoAtual) {
      secaoAtual = item.secaoId;
      raiz.append(h('p', { class: 'vivo__sec' }, `${item.secaoNum} · ${item.secaoTitulo}`));
    }
    raiz.append(
      h('div', { class: 'vivo__item', dataset: { g: item.g } },
        h('span', { class: 'vivo__marca', 'aria-hidden': 'true' }),
        h('span', { class: 'vivo__texto' }, item.t),
        item.vezes > 1 ? h('span', { class: 'vivo__vezes' }, `×${item.vezes}`) : null),
    );
  }
}

// ---------- exportar ----------
function dadosExport() {
  return { itens: marcados(SECOES, estado), ultima: estado.ultima, data: new Date() };
}

let exportando = false;
async function exportar(tipo) {
  if (exportando) return;
  const status = $('#statusExportar');
  const dados = dadosExport();
  if (!dados.itens.length) {
    status.textContent = 'Marque pelo menos um item antes de baixar.';
    status.dataset.erro = '';
    return;
  }
  exportando = true;
  const botoes = [...document.querySelectorAll('[data-exportar]')];
  for (const b of botoes) b.disabled = true;
  delete status.dataset.erro;
  status.textContent = tipo === 'png' ? 'Gerando a imagem…' : 'Gerando o PDF…';
  try {
    if (tipo === 'png') await baixarPng(dados);
    else baixarPdf(dados);
    status.textContent = tipo === 'png' ? 'PNG baixado.' : 'PDF baixado.';
  } catch (erro) {
    status.dataset.erro = '';
    status.textContent = `Não consegui gerar o ${tipo.toUpperCase()}: ${erro.message}`;
  } finally {
    exportando = false;
    const vazio = resumir(SECOES, estado).todos === 0;
    for (const b of botoes) b.disabled = vazio;
  }
}

// ---------- ligações ----------
function ligar() {
  const busca = $('#busca');
  busca.addEventListener('input', () => {
    filtro.texto = semAcento(busca.value).trim();
    aplicarFiltro();
  });
  for (const radio of document.querySelectorAll('input[name="modo"]')) {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        filtro.modo = radio.value;
        aplicarFiltro();
      }
    });
  }

  const ultima = $('#ultima');
  ultima.maxLength = MAX_ULTIMA;
  ultima.addEventListener('input', () => estado.definirUltima(ultima.value));

  for (const botao of document.querySelectorAll('[data-exportar]')) {
    botao.addEventListener('click', () => exportar(botao.dataset.exportar));
  }

  $('#barraVer').addEventListener('click', () => {
    $('#colinha').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  const dialogo = $('#dlgLimpar');
  $('#abrirLimpar').addEventListener('click', () => dialogo.showModal());
  // o botão fecha o diálogo sozinho (form method="dialog"); aqui só apaga
  dialogo.querySelector('button[value="apagar"]').addEventListener('click', () => {
    estado.limpar();
    aplicarFiltro();
    const status = $('#statusExportar');
    delete status.dataset.erro;
    status.textContent = 'Tudo apagado.';
  });

  estado.assinar(atualizar);

  // destaca no índice o mandamento que está na tela
  const ligacoes = new Map([...document.querySelectorAll('.indice a')].map((a) => [a.dataset.secao, a]));
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        for (const [id, a] of ligacoes) {
          if (id === entrada.target.dataset.secao) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-15% 0px -70% 0px' },
  );
  for (const { el } of refsSecao.values()) observador.observe(el);
}

montarLeitura();
montarExame();
ligar();
atualizar();
aplicarFiltro();
