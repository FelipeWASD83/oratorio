// vistas/escrever.js: escrever uma oração própria, com modelos, dicas enquanto escreve (sem IA)
// e o revisor de IA (no servidor, com o Catecismo como base).
//
// Salva sozinho a cada pausa. Aplicar sugestão da IA guarda a versão anterior: "Desfazer" volta.

import { h, id, dataCurta, atrasar } from '../util.js';
import { api, dados } from '../api.js';
import { ctx, toast } from '../contexto.js';
import { MODELOS } from '../conteudo/modelos.js';
import { sugerir } from '../sugestoes.js';
import { reRender } from '../main.js';

export async function render(rota) {
  const minhas = await dados.listar('oracoes');
  let [atual] = rota.args;
  if (atual && !minhas[atual]) atual = null;
  const chave = atual || id();
  const oracao = minhas[chave] || { titulo: '', texto: '', modelo: 'em-branco', criada: Date.now() };
  let anterior = null;   // para o Desfazer depois de aplicar sugestão

  const titulo = h('input', { class: 'campo editor__titulo', value: oracao.titulo, placeholder: 'Título (ex.: Pela minha mãe)', maxlength: 120, 'aria-label': 'Título' });
  const texto = h('textarea', { class: 'campo editor__texto', rows: 14, placeholder: 'Senhor, ...', 'aria-label': 'Texto da oração' }, oracao.texto);
  const estado = h('span', { class: 'texto-fraco', style: 'font-size:.85rem' }, minhas[chave] ? `Salva em ${dataCurta(oracao.atualizada || oracao.criada)}` : 'Ainda não salva');
  const dicas = h('ul', { class: 'lista-limpa dicas', 'aria-live': 'polite' });
  const revisao = h('div', { class: 'revisao' });
  const botaoDesfazer = h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', hidden: true, onclick: () => { if (anterior !== null) { texto.value = anterior; anterior = null; botaoDesfazer.hidden = true; aoMudar(); } } }, 'Desfazer');

  const salvar = async () => {
    if (!texto.value.trim() && !titulo.value.trim()) return;
    const valor = { titulo: titulo.value.trim(), texto: texto.value, modelo: seletor.value, criada: oracao.criada, atualizada: Date.now() };
    try {
      await dados.gravar('oracoes', chave, valor);
      estado.textContent = 'Salva agora';
      if (!atual) { atual = chave; history.replaceState(null, '', `#/escrever/${chave}`); }
    } catch (erro) { estado.textContent = 'Não salvou: ' + erro.message; }
  };
  const salvarDepois = atrasar(salvar, 1200);
  const desenharDicas = () => {
    dicas.replaceChildren(...sugerir(texto.value).map((s) => h('li', { class: 'dica dica--' + s.tipo }, h('span', { class: 'dica__marca', 'aria-hidden': 'true' }), h('span', null, s.texto))));
  };
  const desenharDicasDepois = atrasar(desenharDicas, 350);
  const aoMudar = () => { estado.textContent = 'Escrevendo…'; salvarDepois(); desenharDicasDepois(); };
  texto.addEventListener('input', aoMudar);
  titulo.addEventListener('input', aoMudar);

  const seletor = h('select', { class: 'campo', 'aria-label': 'Modelo', onchange: () => {
    const m = MODELOS.find((x) => x.id === seletor.value);
    if (texto.value.trim() && !confirm('Trocar pelo modelo apaga o que está escrito. Continuar?')) { seletor.value = oracao.modelo || 'em-branco'; return; }
    anterior = texto.value;
    texto.value = m.texto;
    if (!titulo.value.trim() && m.id !== 'em-branco') titulo.value = m.nome;
    botaoDesfazer.hidden = !anterior;
    dicaModelo.textContent = m.dica || '';
    aoMudar();
    texto.focus();
  } }, MODELOS.map((m) => h('option', { value: m.id, selected: m.id === (oracao.modelo || 'em-branco') }, m.nome)));
  const dicaModelo = h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, MODELOS.find((m) => m.id === seletor.value)?.dica || '');

  const ia = ctx.estado.ia;
  const botaoRevisar = h('button', { class: 'botao', type: 'button', disabled: !ia.pronta, onclick: async () => {
    botaoRevisar.disabled = true;
    revisao.replaceChildren(h('p', { class: 'carregando' }, 'A IA está lendo a sua oração'));
    try {
      await salvar();
      const r = await api.post('/api/ia/revisar', { titulo: titulo.value, texto: texto.value });
      revisao.replaceChildren(...desenharRevisao(r, texto, (novo) => { anterior = texto.value; texto.value = novo; botaoDesfazer.hidden = false; aoMudar(); }));
    } catch (erro) {
      revisao.replaceChildren(h('p', { class: 'aviso aviso--grave' }, erro.message));
    } finally { botaoRevisar.disabled = false; }
  } }, 'Revisar com IA');

  const editor = h('section', null, h('div', { class: 'miolo editor' },
    h('div', { class: 'editor__principal' },
      h('div', { class: 'linha-campo' }, titulo),
      h('div', { class: 'editor__modelo' }, h('label', { class: 'rotulo', for: 'seletorModelo' }, 'Começar de um modelo'), seletor, dicaModelo),
      texto,
      h('div', { class: 'editor__acoes' }, botaoRevisar, h('button', { class: 'botao botao--linha', type: 'button', onclick: () => salvar().then(() => toast('Salva.')) }, 'Salvar'), botaoDesfazer,
        h('a', { class: 'botao botao--fantasma', href: '#/escrever', onclick: () => { if (location.hash === '#/escrever') setTimeout(reRender, 0); } }, 'Nova'), estado),
      ia.pronta ? null : h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, 'O revisor de IA precisa de uma chave (Ajustes).'),
      revisao),
    h('aside', { class: 'editor__lado' }, h('p', { class: 'rotulo rotulo--lit' }, 'Dicas enquanto você escreve'), dicas)));
  seletor.id = 'seletorModelo';

  const lista = Object.entries(minhas).sort((a, b) => (b[1].atualizada || 0) - (a[1].atualizada || 0));
  const suas = h('section', null, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'As suas orações'),
    lista.length
      ? h('div', { class: 'grade' }, lista.map(([k, o]) => h('div', { class: 'cartao' },
        h('h3', null, o.titulo || 'Sem título'),
        h('p', { class: 'texto-fraco', style: 'white-space:pre-line;max-height:7.5em;overflow:hidden' }, o.texto),
        h('div', { class: 'cartao__pe' },
          h('a', { class: 'botao botao--pequeno', href: `#/escrever/${k}` }, k === chave ? 'Aberta' : 'Abrir'),
          h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', onclick: async () => { if (confirm(`Apagar "${o.titulo || 'Sem título'}"?`)) { await dados.apagar('oracoes', k); if (k === chave) location.hash = '#/escrever'; else reRender(); } } }, 'Apagar'),
          h('span', { class: 'texto-fraco', style: 'margin-left:auto;font-size:.85rem' }, dataCurta(o.atualizada || o.criada))))))
      : h('p', { class: 'texto-fraco' }, 'As orações que você salvar aparecem aqui (e no celular, pelo servidor de casa).')));

  const como = h('section', null, h('div', { class: 'miolo miolo--estreito leitura' },
    h('p', { class: 'rotulo' }, 'Como funciona'),
    h('p', null, 'As dicas ao lado são regras simples, feitas aqui mesmo, sem IA e sem mandar nada para fora: as quatro atitudes da oração (louvor, perdão, gratidão e pedido), começar chamando por quem você fala, fechar com "Amém", não misturar "tu" e "vós", e alguns cuidados (pedir a intercessão dos santos, não tratar a oração como fórmula mágica).'),
    h('p', { class: 'texto-fraco' }, `O revisor de IA lê a oração inteira com o Catecismo como base (o que ele diz sobre a oração vai junto no pedido), confere a doutrina e sugere melhorias mantendo a sua voz. Ele usa ${ia.modelo}${ia.reserva ? `, com ${ia.reserva} de reserva` : ''}; o texto da oração vai para a API e não fica guardado lá.`)));

  return { titulo: 'Escrever oração', secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, h('a', { href: '#/oracoes', style: 'color:inherit' }, 'Orações'), ' · escrever'),
      h('h1', null, oracao.titulo || 'Uma oração sua'),
      h('p', { class: 'cabeca__sub' }, 'Do seu jeito. Os modelos ajudam a começar e as dicas aparecem enquanto você escreve.'))),
    editor, suas, como,
  ], depois: () => { desenharDicas(); if (!oracao.texto) texto.focus(); } };
}

function desenharRevisao(r, campo, aplicar) {
  const partes = [h('p', { class: 'rotulo rotulo--lit' }, 'Revisão'), h('p', null, r.comentario)];
  if (r.pontos_fortes?.length) partes.push(h('ul', { class: 'revisao__fortes' }, r.pontos_fortes.map((p) => h('li', null, p))));
  if (r.alerta_doutrinal) partes.push(h('p', { class: 'aviso aviso--grave' }, h('b', null, 'Atenção: '), r.alerta_doutrinal));
  if (r.sugestoes?.length) {
    partes.push(h('ol', { class: 'lista-limpa divisor revisao__sugestoes' }, r.sugestoes.map((s) => {
      const botao = h('button', { class: 'botao botao--pequeno', type: 'button', disabled: !s.no_texto, onclick: () => {
        if (!campo.value.includes(s.trecho)) { botao.disabled = true; botao.textContent = 'O trecho mudou'; return; }
        aplicar(campo.value.replace(s.trecho, s.sugestao));
        botao.disabled = true;
        botao.textContent = 'Aplicada';
      } }, s.no_texto ? 'Aplicar' : 'Trecho não achado');
      return h('li', { style: 'padding:.8rem 0;display:grid;gap:.35rem' },
        s.trecho ? h('p', { class: 'texto-fraco' }, h('s', null, s.trecho)) : null,
        h('p', { style: 'font-family:var(--serif);font-size:1.12rem' }, s.sugestao),
        h('p', { class: 'texto-fraco', style: 'font-size:.9rem' }, s.porque),
        h('div', null, botao));
    })));
  }
  if (r.versao_revisada && r.versao_revisada.trim() !== campo.value.trim()) {
    partes.push(h('details', { class: 'revisao__versao' },
      h('summary', null, 'Ver a oração inteira revisada'),
      h('p', { style: 'white-space:pre-line;font-family:var(--serif);font-size:1.12rem;margin-top:.6rem' }, r.versao_revisada),
      h('button', { class: 'botao botao--linha botao--pequeno', type: 'button', style: 'margin-top:.6rem', onclick: () => aplicar(r.versao_revisada) }, 'Usar esta versão')));
  }
  const uso = r.uso?.[0];
  if (uso) partes.push(h('p', { class: 'texto-fraco', style: 'font-size:.82rem' }, `Revisado por ${uso.modelo}${uso.reserva ? ' (reserva)' : ''}${uso.usd ? ` · US$ ${uso.usd.toFixed(4)}` : ''}`));
  return partes;
}
