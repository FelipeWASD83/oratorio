// colinha-ponte.js: abre a Colinha de pecados (copiada em vendor/colinha) guardando as marcações
// no servidor do Oratório, atrás do cadeado, em vez do localStorage do navegador.
//
// A colinha aceita um "armazém" de fora (globalThis.colinhaArmazem, com getItem e setItem).
// Trancado: um armazém em memória, que não mostra o que foi salvo e não salva nada.

const COLECAO = '/api/dados/colinha';
let trancada = false;
let valor = null;

try {
  const r = await fetch(COLECAO, { credentials: 'same-origin' });
  if (r.status === 423) trancada = true;
  else if (r.ok) valor = ((await r.json()).itens || {}).estado || null;
} catch { /* servidor fora: funciona em memória */ trancada = true; }

let timer = null;
const memoria = new Map();
globalThis.colinhaArmazem = trancada
  ? { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v), removeItem: (k) => memoria.delete(k) }
  : {
    getItem: () => (valor ? JSON.stringify(valor) : null),
    setItem: (_k, texto) => {
      valor = JSON.parse(texto);
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetch(COLECAO + '/estado', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valor }) })
          .catch(() => {});
      }, 400);
    },
    removeItem: () => { valor = null; fetch(COLECAO + '/estado', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {}); },
  };

if (trancada) {
  const faixa = document.createElement('p');
  faixa.textContent = 'Cadeado trancado: o que você marcar agora não fica salvo, e o que já estava salvo não aparece.';
  faixa.style.cssText = 'margin:0;padding:.7rem 1rem;background:#1c1a17;color:#f1ece2;font:600 .9rem/1.4 system-ui,sans-serif;text-align:center';
  document.body.prepend(faixa);
}

await import('../vendor/colinha/js/main.js');
