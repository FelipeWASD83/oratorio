// util.js: pecinhas de DOM e de texto usadas por todas as vistas.

/** h('div', { class: 'x', onclick: fn }, filhos...): cria um elemento. Filho null/false é ignorado; listas são achatadas. */
export function h(tag, atributos, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dados') Object.assign(el.dataset, v);
    else if (k === 'estilo') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function escapar(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function id() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Date.now().toString(36) + '-' + [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function dataCurta(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

export function dataHora(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function plural(n, um, varios) {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
}

export function atrasar(fn, ms) {
  let t = null;
  const f = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  f.agora = (...a) => { clearTimeout(t); fn(...a); };
  return f;
}

/** Guarda conveniências deste aparelho (aba escolhida, tamanho de letra). Pode falhar em janela privada. */
export const local = {
  ler(chave, padrao) {
    try { const v = localStorage.getItem('oratorio:' + chave); return v === null ? padrao : JSON.parse(v); } catch { return padrao; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem('oratorio:' + chave, JSON.stringify(valor)); } catch { /* sem armazenamento: só não lembra */ }
  },
};
