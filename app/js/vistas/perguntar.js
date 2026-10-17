// vistas/perguntar.js: "Isso é pecado?" pela IA, com o Catecismo como base principal e a Bíblia como apoio.
// Cada § e cada versículo da resposta aparece com o texto de verdade, para conferir.
// O histórico fica atrás do cadeado (as perguntas dizem o que a pessoa fez).

import { h, dataCurta } from '../util.js';
import { api, dados } from '../api.js';
import { ctx, trancado, pedirSenha, refLegivel, abrirGaveta } from '../contexto.js';
import { reRender } from '../main.js';

const MATERIA = {
  grave: { nome: 'Matéria grave', classe: 'chip chip--grave' },
  pode_ser_grave: { nome: 'Pode ser grave', classe: 'chip chip--grave' },
  leve: { nome: 'Matéria leve', classe: 'chip' },
  nao_e_pecado: { nome: 'Não é pecado', classe: 'chip chip--lit' },
  depende: { nome: 'Depende', classe: 'chip' },
  fora_do_tema: { nome: 'Fora do tema', classe: 'chip' },
};

let ultima = null;

export async function render(rota) {
  const [aberta] = rota.args;
  const ia = ctx.estado.ia;
  const inicial = rota.query.get('q') || '';
  let historico = null;
  if (!trancado()) historico = Object.entries(await dados.listar('perguntas', { recarregar: true })).sort((a, b) => b[0].localeCompare(a[0]));
  if (aberta && historico) {
    const achada = historico.find(([k]) => k === aberta);
    if (achada) ultima = achada[1];
  }

  const campo = h('textarea', { class: 'campo', rows: 3, maxlength: 2000, placeholder: 'Ex.: é pecado comungar sem ter me confessado depois de faltar à missa?', 'aria-label': 'Sua pergunta' }, inicial);
  const resultado = h('div', { class: 'miolo miolo--estreito resposta' });
  const botao = h('button', { class: 'botao', type: 'submit', disabled: !ia.pronta }, 'Perguntar');
  const perguntar = async () => {
    const pergunta = campo.value.trim();
    if (!pergunta) { campo.focus(); return; }
    botao.disabled = true;
    resultado.replaceChildren(h('p', { class: 'carregando' }, 'Procurando no Catecismo e pensando'));
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      ultima = await api.post('/api/ia/perguntar', { pergunta });
      resultado.replaceChildren(...desenharResposta(ultima));
      if (ultima.salva) { history.replaceState(null, '', `#/perguntar/${ultima.id}`); dados.esquecer('perguntas'); }
    } catch (erro) {
      resultado.replaceChildren(h('p', { class: 'aviso aviso--grave' }, erro.message));
    } finally { botao.disabled = !ia.pronta; }
  };

  const cabeca = h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Caminho · pergunte à IA'),
    h('h1', null, 'Isso é pecado?'),
    h('p', { class: 'cabeca__sub' }, 'A resposta se apoia primeiro no Catecismo, depois na Bíblia, e mostra os parágrafos para você conferir.'),
    h('form', { style: 'margin-top:1.4rem;max-width:46rem;display:grid;gap:.7rem', onsubmit: (e) => { e.preventDefault(); perguntar(); } },
      campo,
      h('div', { style: 'display:flex;gap:.8rem;align-items:center;flex-wrap:wrap' }, botao,
        h('span', { class: 'texto-fraco', style: 'font-size:.88rem' }, ia.pronta
          ? `${ia.falsa ? 'IA de demonstração' : ia.modelo}${ia.reserva && !ia.falsa ? ` · reserva ${ia.reserva}` : ''} · gasto hoje US$ ${ia.gasto_hoje.toFixed(2)} de ${ia.teto_dia.toFixed(2)}`
          : 'Falta a chave de IA (Ajustes).')))));
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) perguntar(); });

  if (ultima) resultado.replaceChildren(...desenharResposta(ultima));
  else resultado.replaceChildren(h('p', { class: 'rotulo' }, 'A resposta aparece aqui'), h('p', { class: 'texto-fraco', style: 'margin-top:.6rem' }, 'Escreva com as suas palavras. Quanto mais concreto (o que, quando, sabendo ou não), melhor a resposta.'));

  const lista = h('section', null, h('div', { class: 'miolo miolo--estreito' },
    h('p', { class: 'rotulo' }, 'Suas perguntas'),
    historico === null
      ? h('div', { class: 'aviso', style: 'margin-top:.6rem' }, h('p', null, 'O histórico fica atrás do cadeado. Perguntar funciona trancado, mas a resposta não fica guardada.'),
        h('p', { style: 'margin-top:.6rem' }, h('button', { class: 'botao botao--pequeno', type: 'button', onclick: async () => { if (await pedirSenha()) reRender(); } }, 'Destravar')))
      : historico.length
        ? h('ul', { class: 'lista-limpa divisor', style: 'margin-top:.6rem' }, historico.slice(0, 50).map(([k, p]) => h('li', { style: 'padding:.6rem 0;display:flex;gap:.8rem;align-items:baseline' },
          h('span', { class: (MATERIA[p.materia] || MATERIA.depende).classe, style: 'font-size:.75rem' }, (MATERIA[p.materia] || MATERIA.depende).nome),
          h('a', { href: `#/perguntar/${k}` }, p.pergunta.length > 90 ? p.pergunta.slice(0, 90) + '…' : p.pergunta),
          h('span', { class: 'texto-fraco', style: 'margin-left:auto;font-size:.82rem;white-space:nowrap' }, dataCurta(p.quando || Date.now())),
          h('button', { class: 'botao-texto', type: 'button', style: 'font-size:.82rem', onclick: async () => { await dados.apagar('perguntas', k); if (ultima && ultima.id === k) ultima = null; reRender(); } }, 'apagar'))))
        : h('p', { class: 'texto-fraco', style: 'margin-top:.6rem' }, 'Nenhuma pergunta guardada ainda.')));

  const como = h('section', null, h('div', { class: 'miolo miolo--estreito leitura' },
    h('p', { class: 'rotulo' }, 'Como a resposta é feita'),
    h('p', null, 'O Oratório procura no Catecismo os parágrafos ligados à pergunta e manda à IA junto com os parágrafos sobre o pecado (§ 1849 a 1864). A IA é instruída a responder primeiro pelo Catecismo e usar a Bíblia como apoio.'),
    h('p', null, 'Ela nunca diz que você "está em pecado mortal": isso pede três condições juntas, matéria grave, pleno conhecimento e consentimento deliberado ', h('button', { class: 'ref', type: 'button', onclick: () => abrirGaveta('cic', 1857) }, 'CIC 1857'), ', e as duas últimas só você e o confessor sabem. A resposta fala da gravidade da matéria.'),
    h('p', { class: 'texto-fraco' }, 'IA erra. Por isso cada § citado aparece com o texto de verdade, e o que não veio da busca fica marcado. Caso concreto, converse com um padre.')));

  return { titulo: 'Isso é pecado?', secoes: [cabeca, h('section', null, resultado), lista, como] };
}

function desenharResposta(r) {
  const materia = MATERIA[r.materia] || MATERIA.depende;
  const partes = [
    h('p', { class: 'rotulo' }, 'Pergunta'),
    h('p', { class: 'resposta__pergunta' }, r.pergunta),
    h('div', { style: 'display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:1rem' }, h('span', { class: materia.classe }, materia.nome)),
    h('p', { class: 'resposta__resumo' }, r.resumo),
    ...r.explicacao.map((p) => h('p', null, p)),
  ];
  if (r.catecismo.length) {
    partes.push(h('p', { class: 'rotulo', style: 'margin-top:1.6rem' }, 'No Catecismo'));
    partes.push(h('div', { class: 'citacoes' }, r.catecismo.map((c) => h('details', { class: 'citacao-cic' + (c.existe ? '' : ' citacao-cic--falsa') },
      h('summary', null, h('b', null, `§ ${c.n}`), ' ', c.porque,
        !c.existe ? h('span', { class: 'chip chip--grave', style: 'margin-left:.4rem' }, 'este § não existe: a IA errou') : !c.do_material ? h('span', { class: 'chip', style: 'margin-left:.4rem' }, 'citado de memória pela IA') : null),
      c.existe ? h('div', null, h('p', { class: 'rotulo', style: 'margin:.6rem 0 .3rem' }, (c.secao || []).slice(-2).join(' · ')), h('p', { class: 'citacao-cic__texto' }, c.texto),
        h('button', { class: 'botao-texto', type: 'button', style: 'font-size:.85rem;margin-top:.4rem', onclick: () => abrirGaveta('cic', c.n) }, 'ver os vizinhos')) : null))));
  }
  if (r.biblia.length) {
    partes.push(h('p', { class: 'rotulo', style: 'margin-top:1.6rem' }, 'Na Bíblia'));
    partes.push(h('div', { class: 'citacoes' }, r.biblia.map((b) => h('div', { class: 'citacao-biblia' },
      h('p', null, h('b', null, refLegivel(b.ref)), ' ', h('span', { class: 'texto-fraco' }, b.porque), !b.existe ? h('span', { class: 'chip chip--grave', style: 'margin-left:.4rem' }, 'trecho não achado') : null),
      b.versos.length ? h('p', { class: 'escritura', style: 'font-size:1.12rem' }, b.versos.map((v) => [h('span', { class: 'v' }, v.v), v.texto, ' '])) : null))));
  }
  if (r.conselho) partes.push(h('p', { class: 'aviso', style: 'margin-top:1.6rem' }, r.conselho));
  const uso = (r.uso || []).filter((u) => u && u.modelo);
  if (uso.length) partes.push(h('p', { class: 'texto-fraco', style: 'font-size:.82rem;margin-top:1rem' }, `Respondido por ${uso[uso.length - 1].modelo}${uso.some((u) => u.reserva) ? ' (reserva)' : ''} · US$ ${uso.reduce((s, u) => s + (u.usd || 0), 0).toFixed(4)}${r.salva === false ? ' · não guardada (cadeado trancado)' : ''}`));
  return partes;
}
