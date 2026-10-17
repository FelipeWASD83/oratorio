// vistas/oracoes.js: as orações prontas, o terço do dia, as orações que ele escreveu e as intenções.

import { h, id, dataCurta, plural } from '../util.js';
import { dados } from '../api.js';
import { ctx, textoDaRef, refLegivel, toast } from '../contexto.js';
import { GRUPOS, ORACOES, MISTERIOS, misteriosDoDia } from '../conteudo/oracoes.js';
import { partes } from '../liturgia.js';
import { reRender } from '../main.js';

export async function render(rota) {
  const [aberta] = rota.args;
  const minhas = Object.entries(await dados.listar('oracoes')).sort((a, b) => (b[1].atualizada || 0) - (a[1].atualizada || 0));
  const intencoes = Object.entries(await dados.listar('intencoes')).sort((a, b) => (b[1].criada || 0) - (a[1].criada || 0));
  const [chaveDoDia, doDia] = misteriosDoDia(partes(ctx.hojeLit.n).semana);
  const pascal = ctx.hojeLit.tempo === 'pascoa';

  const cabeca = h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Oração'),
    h('h1', null, 'Orações'),
    h('p', { class: 'cabeca__sub' }, `${ORACOES.length} orações da tradição, o terço e as suas.`),
    h('div', { class: 'cabeca__acoes' },
      h('a', { class: 'botao', href: `#/terco/${chaveDoDia}` }, `Rezar o terço (${doDia.nome.toLowerCase()})`),
      h('a', { class: 'botao botao--linha', href: '#/escrever' }, 'Escrever uma oração'),
      h('a', { class: 'botao botao--fantasma', href: `#/oracoes/${pascal ? 'rainha-do-ceu' : 'angelus'}` }, pascal ? 'Rainha do Céu' : 'Angelus'))));

  const prontas = h('section', null, h('div', { class: 'miolo' },
    GRUPOS.map((g) => h('div', { class: 'grupo-oracoes' },
      h('p', { class: 'rotulo' }, g.nome),
      h('div', { class: 'grade grade--larga' }, ORACOES.filter((o) => o.grupo === g.id).map((o) => cartaoOracao(o, aberta === o.id)))))));

  const terco = h('section', null, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'O terço'),
    h('h2', { class: 'titulo-secao' }, 'Hoje: ', h('em', null, doDia.nome.toLowerCase())),
    h('div', { class: 'grade' }, Object.entries(MISTERIOS).map(([k, m]) => h('a', { class: 'cartao', href: `#/terco/${k}` },
      h('p', { class: 'rotulo rotulo--lit' }, m.dias.map((d) => ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d]).join(' e ')),
      h('h3', null, m.nome),
      h('p', { class: 'texto-fraco' }, m.itens.map((i) => i.nome).join(' · ')))),
    h('a', { class: 'cartao', href: '#/terco/misericordia' }, h('p', { class: 'rotulo rotulo--lit' }, 'às 15h, tradicionalmente'), h('h3', null, 'Terço da Misericórdia'), h('p', { class: 'texto-fraco' }, 'Nas contas do terço, rezado com as palavras de Santa Faustina.')))));

  const campoIntencao = h('input', { class: 'campo', placeholder: 'Por quem ou pelo que você quer rezar?', maxlength: 300, 'aria-label': 'Nova intenção' });
  const suas = h('section', null, h('div', { class: 'miolo' },
    h('div', { class: 'grade grade--larga' },
      h('div', null,
        h('p', { class: 'rotulo' }, 'As suas orações'),
        minhas.length
          ? h('ul', { class: 'lista-limpa divisor' }, minhas.map(([k, o]) => h('li', { style: 'padding:.7rem 0;display:flex;gap:1rem;align-items:baseline' },
            h('a', { href: `#/escrever/${k}` }, o.titulo || 'Sem título'),
            h('span', { class: 'texto-fraco', style: 'margin-left:auto;font-size:.85rem' }, dataCurta(o.atualizada || o.criada || Date.now())))))
          : h('p', { class: 'texto-fraco' }, 'Nenhuma ainda. ', h('a', { href: '#/escrever' }, 'Escrever a primeira'), '.')),
      h('div', null,
        h('p', { class: 'rotulo' }, 'Intenções'),
        h('form', { class: 'linha-campo', style: 'margin:.5rem 0 1rem', onsubmit: async (e) => {
          e.preventDefault();
          const texto = campoIntencao.value.trim();
          if (!texto) return;
          await dados.gravar('intencoes', id(), { texto, criada: Date.now(), alcancada: null });
          reRender();
        } }, campoIntencao, h('button', { class: 'botao', type: 'submit' }, 'Guardar')),
        intencoes.length
          ? h('ul', { class: 'lista-limpa divisor' }, intencoes.map(([k, i]) => h('li', { style: 'padding:.6rem 0;display:flex;gap:.8rem;align-items:center' },
            h('input', { type: 'checkbox', checked: !!i.alcancada, 'aria-label': 'Graça alcançada', onchange: async (e) => { await dados.gravar('intencoes', k, { ...i, alcancada: e.target.checked ? Date.now() : null }); if (e.target.checked) toast('Graças a Deus!'); reRender(); } }),
            h('span', { style: i.alcancada ? 'text-decoration:line-through;opacity:.6' : '' }, i.texto),
            i.alcancada ? h('span', { class: 'chip chip--lit' }, 'graça alcançada') : null,
            h('button', { class: 'botao-texto', type: 'button', style: 'margin-left:auto;font-size:.85rem', onclick: async () => { await dados.apagar('intencoes', k); reRender(); } }, 'tirar'))))
          : h('p', { class: 'texto-fraco' }, 'Anote aqui pelo que você reza. Quando a graça vier, marque: dá para olhar para trás e agradecer.'),
        intencoes.some(([, i]) => i.alcancada) ? h('p', { class: 'texto-fraco', style: 'margin-top:.6rem' }, plural(intencoes.filter(([, i]) => i.alcancada).length, 'graça alcançada', 'graças alcançadas')) : null))));

  return { titulo: 'Orações', secoes: [cabeca, prontas, terco, suas], depois: () => {
    if (aberta) document.getElementById('oracao-' + aberta)?.scrollIntoView({ block: 'center' });
  } };
}

function cartaoOracao(o, aberta) {
  const corpo = h('div', { class: 'oracao__texto' });
  const det = h('details', { class: 'cartao oracao', id: 'oracao-' + o.id, open: aberta || null, ontoggle: async () => {
    if (det.open && o.daBiblia && !corpo.childElementCount) {
      const versos = await textoDaRef(o.biblia).catch(() => []);
      corpo.replaceChildren(...versos.map((v) => h('p', null, v.texto)));
    }
  } },
  h('summary', null, h('h3', null, o.nome), o.nota ? h('p', { class: 'texto-fraco', style: 'margin-top:.3rem;font-size:.92rem' }, o.nota) : null),
  corpo);
  if (!o.daBiblia) {
    corpo.append(...o.texto.split('\n').map((linha) => {
      const resposta = /^R\. /.test(linha);
      const verso = /^V\. /.test(linha);
      return h('p', { class: resposta ? 'oracao__r' : verso ? 'oracao__v' : '' }, verso || resposta ? h('b', null, linha.slice(0, 2) + ' ') : null, verso || resposta ? linha.slice(3) : linha);
    }));
  }
  if (o.biblia) corpo.append(h('p', { class: 'citacao__ref' }, 'Na Bíblia: ', refLegivel(o.biblia)));
  if (o.daBiblia && aberta) det.dispatchEvent(new Event('toggle'));
  return det;
}
