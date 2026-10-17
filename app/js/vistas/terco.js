// vistas/terco.js: o terço conta por conta (setas, espaço ou toque), com o mistério e o trecho da Bíblia.
// Onde parou fica neste aparelho (localStorage), por mistério.

import { h, local } from '../util.js';
import { ctx, textoDaRef, refLegivel } from '../contexto.js';
import { ORACOES, MISTERIOS, misteriosDoDia, contasDoTerco, contasDaMisericordia } from '../conteudo/oracoes.js';
import { partes } from '../liturgia.js';

const porId = Object.fromEntries(ORACOES.map((o) => [o.id, o]));

export async function render(rota) {
  let [chave] = rota.args;
  if (!chave || (!MISTERIOS[chave] && chave !== 'misericordia')) chave = misteriosDoDia(partes(ctx.hojeLit.n).semana)[0];
  const misericordia = chave === 'misericordia';
  const m = misericordia ? { nome: 'Terço da Misericórdia', itens: [] } : MISTERIOS[chave];
  const contas = misericordia ? contasDaMisericordia() : contasDoTerco(chave);
  let pos = Math.min(local.ler('terco:' + chave, 0), contas.length - 1);
  const refs = await Promise.all(m.itens.map((i) => textoDaRef(i.biblia).catch(() => [])));

  const grande = h('div', { class: 'terco__oracao', 'aria-live': 'polite' });
  const titulo = h('p', { class: 'rotulo rotulo--lit' });
  const meditacao = h('div', { class: 'terco__meditar' });
  const contador = h('p', { class: 'texto-fraco' });
  const fio = h('div', { class: 'terco__fio', 'aria-hidden': 'true' });

  const desenhar = () => {
    const c = contas[pos];
    local.gravar('terco:' + chave, pos);
    const oracao = c.oracao ? porId[c.oracao] : null;
    titulo.textContent = c.tipo === 'anuncio' ? 'Anúncio do mistério'
      : oracao ? oracao.nome + (c.numero ? ` · ${c.numero}ª` : '') + (c.nota ? ` · ${c.nota}` : '')
        : c.tipo === 'pai' ? 'Conta grande' : c.tipo === 'final' ? `Para terminar · ${c.numero}ª vez` : `Conta pequena · ${c.numero}ª`;
    grande.replaceChildren(...String(c.texto || oracao?.texto || '').split('\n').map((l) => h('p', null, l)));
    const i = c.misterio;
    if (!misericordia && i !== undefined) {
      const item = m.itens[i];
      meditacao.replaceChildren(
        h('p', { class: 'rotulo' }, `${i + 1}º mistério`),
        h('h3', null, item.nome),
        h('p', { class: 'texto-fraco' }, item.meditar),
        refs[i].length ? h('blockquote', { class: 'citacao', style: 'margin:.6rem 0 0;font-size:1.1rem' }, refs[i].map((v) => v.texto).join(' ').slice(0, 520) + (refs[i].map((v) => v.texto).join(' ').length > 520 ? '…' : ''), h('span', { class: 'citacao__ref' }, refLegivel(item.biblia))) : null);
    } else meditacao.replaceChildren(h('p', { class: 'texto-fraco' }, misericordia ? 'Em cada dezena, a conta grande e as dez pequenas.' : 'As orações de abertura: o Creio, o Pai-Nosso, três Ave-Marias e o Glória.'));
    contador.textContent = `${pos + 1} de ${contas.length}`;
    // o fio mostra a dezena atual (ou a abertura)
    const grupo = contas.filter((x) => x.misterio === c.misterio && (x.tipo === 'ave' || x.tipo === 'pai'));
    fio.replaceChildren(...grupo.map((x) => h('span', { class: 'conta conta--' + x.tipo + (x === c ? ' conta--atual' : contas.indexOf(x) < pos ? ' conta--feita' : '') })));
    botaoVoltar.disabled = pos === 0;
    botaoIr.textContent = pos === contas.length - 1 ? 'Recomeçar' : 'Próxima conta →';
  };
  const ir = (passo) => {
    if (passo > 0 && pos === contas.length - 1) pos = 0; else pos = Math.max(0, Math.min(contas.length - 1, pos + passo));
    desenhar();
  };
  const botaoVoltar = h('button', { class: 'botao botao--fantasma', type: 'button', onclick: () => ir(-1) }, '← Voltar');
  const botaoIr = h('button', { class: 'botao', type: 'button', onclick: () => ir(1) }, 'Próxima conta →');
  const tecla = (e) => {
    if (!document.body.contains(grande)) { document.removeEventListener('keydown', tecla); return; }
    if (e.target instanceof Element && e.target.closest('input,textarea,select')) return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); ir(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
  };
  document.addEventListener('keydown', tecla);

  const secoes = [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, h('a', { href: '#/oracoes', style: 'color:inherit' }, 'Orações'), ' · terço'),
      h('h1', null, m.nome),
      h('div', { class: 'cabeca__acoes' }, [...Object.entries(MISTERIOS).map(([k, x]) => h('a', { class: k === chave ? 'chip chip--lit' : 'chip', href: `#/terco/${k}` }, x.nome.replace('Mistérios ', ''))),
        h('a', { class: chave === 'misericordia' ? 'chip chip--lit' : 'chip', href: '#/terco/misericordia' }, 'misericórdia')]))),
    h('section', null, h('div', { class: 'miolo terco' },
      h('div', { class: 'terco__principal', onclick: (e) => { if (!e.target.closest('button,a')) ir(1); } },
        titulo, grande,
        h('div', { class: 'terco__botoes' }, botaoVoltar, botaoIr),
        h('p', { class: 'texto-fraco', style: 'font-size:.85rem' }, 'Toque no texto, aperte espaço ou a seta para a direita para avançar.')),
      h('aside', { class: 'terco__lado' }, meditacao))),
    h('section', null, h('div', { class: 'miolo' },
      fio, contador,
      h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', style: 'margin-top:.8rem', onclick: () => { pos = 0; desenhar(); } }, 'Começar do início'))),
    h('section', null, h('div', { class: 'miolo miolo--estreito' },
      misericordia
        ? h('p', { class: 'texto-fraco' }, 'O Terço da Misericórdia vem das revelações a Santa Faustina Kowalska. Reza-se nas contas do terço comum.')
        : h('ol', { class: 'lista-limpa divisor' }, m.itens.map((item, i) => h('li', { style: 'padding:.7rem 0' },
          h('button', { class: 'botao-texto', type: 'button', onclick: () => { pos = contas.findIndex((c) => c.misterio === i); desenhar(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, `${i + 1}º · ${item.nome}`),
          h('span', { class: 'texto-fraco' }, ' · ', refLegivel(item.biblia))))))),
  ];
  return { titulo: m.nome, secoes, depois: desenhar };
}
