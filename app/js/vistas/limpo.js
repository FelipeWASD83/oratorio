// vistas/limpo.js: os dias limpo do Vigia (atrás do cadeado). O número é o mesmo da nova aba.
//
// No PC, com a extensão: lê e escreve direto no Vigia. Sem ela (no celular): mostra o último
// retrato que o PC mandou e guarda a recaída como pendente, que o PC entrega ao Vigia.

import { h, id, dataCurta, dataHora, plural } from '../util.js';
import { trancado, avisoTrancado, textoDaRef, refLegivel, toast, haQuanto } from '../contexto.js';
import { dados } from '../api.js';
import { ORACOES } from '../conteudo/oracoes.js';
import { MODELOS } from '../conteudo/modelos.js';
import { reRender } from '../main.js';

const DIA = 86400000;
const METAS = [1, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365];
const MINUTOS_DA_VONTADE = 10;

export function proximaMeta(dias) {
  const inteiros = Math.floor(dias);
  let meta = METAS.find((m) => m > inteiros);
  let anterior;
  if (meta === undefined) { meta = (Math.floor(inteiros / 365) + 1) * 365; anterior = meta - 365; } else anterior = METAS[METAS.indexOf(meta) - 1] || 0;
  return { meta, faltam: meta - inteiros, fracao: Math.min(1, Math.max(0, (dias - anterior) / (meta - anterior))) };
}

async function retrato() {
  const itens = await dados.listar('vigia', { recarregar: true });
  return itens.retrato || null;
}

/**
 * Registra "Recaí" ou "Tô com vontade": fica na fila (`vigia/pendente:*`) e a extensão da nova aba entrega ao
 * Vigia em até 30 segundos, se o Brave estiver aberto. O retrato daqui já muda na hora, para a tela não
 * ficar parada esperando; quando a extensão sincroniza, ele é refeito com o número de verdade do Vigia.
 */
async function registrar(tipo) {
  const agora = Date.now();
  await dados.gravar('vigia', 'pendente:' + id(), { tipo, em: agora, aplicado: false });
  const atual = (await dados.listar('vigia')).retrato;
  if (atual) {
    const novo = { ...atual, origem: 'aguardando' };
    if (tipo === 'recair') {
      novo.recorde = Math.max(atual.recorde || 0, agora - atual.inicio);
      novo.recaidas = [...(atual.recaidas || []), { em: agora, durou: agora - atual.inicio }].slice(-30);
      novo.inicio = agora;
    } else novo.vencidas = (atual.vencidas || 0) + 1;
    await dados.gravar('vigia', 'retrato', novo);
  }
}

/** O cartão do "Hoje" (o cadeado já foi conferido por quem chama). */
export async function cartaoLimpo() {
  const r = await retrato();
  if (!r) {
    return h('article', { class: 'cartao' }, h('p', { class: 'rotulo rotulo--lit' }, 'Dias limpo'),
      h('p', { class: 'texto-fraco' }, 'O contador vem do Vigia: deixe o Brave aberto com a nova aba 1.5.0 ou mais nova, que manda o número para cá sozinha.'));
  }
  const dias = (Date.now() - r.inicio) / DIA;
  const m = proximaMeta(dias);
  return h('a', { class: 'cartao', href: '#/limpo' },
    h('p', { class: 'rotulo rotulo--lit' }, 'Dias limpo'),
    h('p', { style: 'font-family:var(--serif);font-size:3.2rem;line-height:1' }, Math.floor(dias), h('span', { style: 'font-size:1.2rem;color:var(--texto-3)' }, ` ${Math.floor(dias) === 1 ? 'dia' : 'dias'} e ${Math.floor((dias % 1) * 24)} h`)),
    h('div', { class: 'barra' }, h('span', { style: `width:${(m.fracao * 100).toFixed(1)}%` })),
    h('p', { class: 'texto-fraco' }, `Faltam ${plural(m.faltam, 'dia', 'dias')} para a meta de ${m.meta}.`));
}

export async function render() {
  if (trancado()) {
    return { titulo: 'Dias limpo', secoes: [
      h('section', { class: 'cabeca' }, h('div', { class: 'miolo' }, h('p', { class: 'rotulo' }, 'Vigia'), h('h1', null, 'Dias limpo'))),
      h('section', null, h('div', { class: 'miolo miolo--estreito' }, avisoTrancado('Esta parte fica atrás do cadeado.', reRender))),
    ] };
  }
  const r = await retrato();
  if (!r) {
    return { titulo: 'Dias limpo', secoes: [
      h('section', { class: 'cabeca' }, h('div', { class: 'miolo' }, h('p', { class: 'rotulo' }, 'Vigia'), h('h1', null, 'Dias limpo'))),
      h('section', null, h('div', { class: 'miolo miolo--estreito leitura' },
        h('p', null, 'O contador é o do Vigia, da nova aba do Brave. Para ele aparecer aqui (e no celular), deixe o Brave aberto com a nova aba na versão 1.5.0 ou mais nova: ela manda o contador para cá sozinha, de 30 em 30 segundos, enquanto o Oratório estiver aberto.'),
        h('p', { class: 'texto-fraco' }, 'O que você registrar aqui ("Recaí", "Tô com vontade"), no PC ou no celular, chega ao Vigia na mesma sincronia.'))),
    ] };
  }
  const agora = Date.now();
  const dias = (agora - r.inicio) / DIA;
  const m = proximaMeta(dias);
  const recorde = Math.max(r.recorde || 0, agora - r.inicio);
  const pendentes = Object.entries(await dados.listar('vigia')).filter(([k, v]) => k.startsWith('pendente:') && v && !v.aplicado);

  const cabeca = h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Vigia · dias limpo'),
    h('p', { style: 'font-family:var(--serif);font-size:clamp(5rem,3rem + 8vw,11rem);line-height:.9;margin-top:.8rem' }, Math.floor(dias)),
    h('p', { class: 'cabeca__sub' }, `${Math.floor(dias) === 1 ? 'dia' : 'dias'} e ${Math.floor((dias % 1) * 24)} horas, desde ${dataHora(r.inicio)}`),
    h('div', { class: 'cabeca__acoes' },
      h('button', { class: 'botao', type: 'button', onclick: () => abrirVontade() }, 'Tô com vontade'),
      h('button', { class: 'botao botao--fantasma', type: 'button', onclick: () => confirmarRecaida() }, 'Recaí'))));

  const numeros = h('section', null, h('div', { class: 'miolo' },
    h('div', { class: 'grade' },
      h('div', { class: 'cartao' }, h('p', { class: 'rotulo rotulo--lit' }, 'Próxima meta'),
        h('p', { style: 'font-family:var(--serif);font-size:2.4rem;line-height:1' }, `${m.meta} dias`),
        h('div', { class: 'barra' }, h('span', { style: `width:${(m.fracao * 100).toFixed(1)}%` })),
        h('p', { class: 'texto-fraco' }, `Faltam ${plural(m.faltam, 'dia', 'dias')}.`)),
      h('div', { class: 'cartao' }, h('p', { class: 'rotulo rotulo--lit' }, 'Recorde'),
        h('p', { style: 'font-family:var(--serif);font-size:2.4rem;line-height:1' }, plural(Math.floor(recorde / DIA), 'dia', 'dias'))),
      h('div', { class: 'cartao' }, h('p', { class: 'rotulo rotulo--lit' }, 'Vontades vencidas'),
        h('p', { style: 'font-family:var(--serif);font-size:2.4rem;line-height:1' }, String(r.vencidas || 0)),
        h('p', { class: 'texto-fraco' }, '"Tô com vontade" que terminou em "Passou".')),
      h('div', { class: 'cartao' }, h('p', { class: 'rotulo rotulo--lit' }, 'Hoje'),
        h('p', { style: 'font-family:var(--serif);font-size:2.4rem;line-height:1' }, String(r.tentativasHoje || 0)),
        h('p', { class: 'texto-fraco' }, 'Avisos e bloqueios do Vigia hoje (até o último retrato).'))),
    h('p', { class: 'texto-fraco', style: 'margin-top:1.2rem' },
      `Último retrato do Vigia: ${haQuanto(r.lidoEm || 0)}${r.lidoEm ? ` (${dataHora(r.lidoEm)})` : ''}.`,
      pendentes.length ? ` ${plural(pendentes.length, 'registro espera', 'registros esperam')} o Brave (precisa estar aberto, com a nova aba 1.5.0).` : '')));

  const vontade = h('section', { id: 'vontade' }, h('div', { class: 'miolo' }, await painelVontade()));
  const historico = h('section', null, h('div', { class: 'miolo miolo--estreito' },
    h('p', { class: 'rotulo' }, 'Histórico'),
    h('h2', { class: 'titulo-secao' }, 'Cada recomeço ', h('em', null, 'também conta')),
    (r.recaidas || []).length
      ? h('ul', { class: 'lista-limpa divisor' }, [...r.recaidas].reverse().map((x) => h('li', { style: 'padding:.6rem 0;display:flex;justify-content:space-between;gap:1rem' }, h('span', null, dataCurta(x.em)), h('span', { class: 'texto-fraco' }, `durou ${plural(Math.floor(x.durou / DIA), 'dia', 'dias')}`))))
      : h('p', { class: 'texto-fraco' }, 'Nenhuma recaída registrada.'),
    h('p', { class: 'aviso', style: 'margin-top:1.5rem' }, 'Recair não apaga o caminho. "O justo cai sete vezes e se levanta" (Pr 24,16). A confissão está aí para isso.')));
  return { titulo: 'Dias limpo', secoes: [cabeca, numeros, vontade, historico] };
}

async function painelVontade() {
  const versos = await Promise.all(['1CO.10.13', 'MAT.26.41'].map((r) => textoDaRef(r).then((v) => ({ r, v })).catch(() => ({ r, v: [] }))));
  const miguel = ORACOES.find((o) => o.id === 'sao-miguel');
  const tentacao = MODELOS.find((m) => m.id === 'tentacao');
  return h('div', { class: 'grade grade--larga' },
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Tô com vontade'),
      h('h3', null, 'Dez minutos. A vontade passa.'),
      h('p', { class: 'texto-fraco' }, 'Levante, beba água, saia do quarto se der. Respire devagar: quatro segundos para dentro, seis para fora.'),
      h('p', { id: 'relogioVontade', style: 'font-family:var(--serif);font-size:3.4rem;line-height:1' }, `${MINUTOS_DA_VONTADE}:00`),
      h('div', { class: 'cartao__pe' },
        h('button', { class: 'botao', type: 'button', id: 'botaoVontade', onclick: () => abrirVontade() }, 'Começar os 10 minutos'),
        h('button', { class: 'botao botao--linha', type: 'button', onclick: async () => { await registrar('vontade'); toast('Passou. Mais uma vitória.'); reRender(); } }, 'Passou'))),
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'A Palavra'),
      versos.map(({ r, v }) => h('blockquote', { class: 'citacao', style: 'margin:0' }, v.map((x) => x.texto).join(' ') || refLegivel(r), h('span', { class: 'citacao__ref' }, refLegivel(r))))),
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Reze agora'),
      h('p', { style: 'white-space:pre-line;font-family:var(--serif);font-size:1.15rem' }, tentacao.texto),
      h('p', { style: 'white-space:pre-line;font-family:var(--serif);font-size:1.05rem' }, miguel.texto)));
}

let timerVontade = null;
function abrirVontade() {
  document.getElementById('vontade')?.scrollIntoView({ behavior: 'smooth' });
  const relogio = document.getElementById('relogioVontade');
  const botao = document.getElementById('botaoVontade');
  if (!relogio) { location.hash = '#/limpo'; return; }
  clearInterval(timerVontade);
  const fim = Date.now() + MINUTOS_DA_VONTADE * 60000;
  if (botao) botao.disabled = true;
  const passo = () => {
    if (!document.body.contains(relogio)) { clearInterval(timerVontade); return; }
    const resta = Math.max(0, fim - Date.now());
    relogio.textContent = `${Math.floor(resta / 60000)}:${String(Math.floor((resta % 60000) / 1000)).padStart(2, '0')}`;
    if (!resta) { clearInterval(timerVontade); relogio.textContent = 'Passou?'; if (botao) botao.disabled = false; }
  };
  passo();
  timerVontade = setInterval(passo, 1000);
}

function confirmarRecaida() {
  const dialogo = h('dialog', { class: 'dialogo' },
    h('h2', { style: 'font-size:1.6rem' }, 'Registrar uma recaída?'),
    h('p', { class: 'texto-fraco', style: 'margin-top:.6rem' }, 'A sequência recomeça agora, igual ao botão "Recaí" do Vigia. O recorde fica guardado.'),
    h('div', { class: 'dialogo__acoes' },
      h('button', { class: 'botao botao--fantasma', type: 'button', onclick: () => dialogo.close() }, 'Cancelar'),
      h('button', { class: 'botao', type: 'button', onclick: async () => { dialogo.close(); await registrar('recair'); toast('Recomeçou. Levante e siga: a confissão está aí.'); reRender(); } }, 'Recaí')));
  dialogo.addEventListener('close', () => setTimeout(() => dialogo.remove(), 50));
  document.body.append(dialogo);
  dialogo.showModal();
}

