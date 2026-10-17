// vistas/calendario.js: o calendário litúrgico do Brasil, mês a mês, com a cor de cada dia.
// Rota: #/calendario ou #/calendario/2026-12 (e ?dia=8 para abrir um dia).

import { h } from '../util.js';
import { ctx } from '../contexto.js';
import { mesLiturgico, diaLiturgico, dataDe, partes, MESES, CORES, dataPorExtenso, datasDoAno } from '../liturgia.js';

const GRAU = { solenidade: 'Solenidade', solenidadePropria: 'Solenidade', festa: 'Festa', festaDoSenhor: 'Festa do Senhor', memoria: 'Memória', facultativa: 'Memória facultativa', privilegiado: 'Dia maior', triduo: 'Tríduo Pascal' };

export async function render(rota) {
  const hj = partes(ctx.hojeLit.n);
  const [aaaamm] = rota.args;
  let ano = hj.ano, mes = hj.mes;
  if (/^\d{4}-\d{2}$/.test(aaaamm || '')) { ano = Number(aaaamm.slice(0, 4)); mes = Number(aaaamm.slice(5)); }
  const dias = mesLiturgico(ano, mes, ctx.santos);
  const escolhido = Number(rota.query.get('dia')) || (ano === hj.ano && mes === hj.mes ? hj.dia : 1);
  const detalhe = diaLiturgico(dataDe(ano, mes, Math.min(escolhido, 31)), ctx.santos);
  const ant = mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, '0')}`;
  const prox = mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const doMes = dias.filter((d) => d.doMes);
  const destaques = doMes.filter((d) => d.celebracao && ['solenidade', 'solenidadePropria', 'festa', 'festaDoSenhor', 'privilegiado', 'triduo'].includes(d.celebracao.grau) || d.jejum);
  const D = datasDoAno(ano);
  const p = (n) => { const x = partes(n); return `${x.dia}/${String(x.mes).padStart(2, '0')}`; };

  return { titulo: `Calendário · ${MESES[mes - 1]}`, secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'O dia · calendário litúrgico do Brasil'),
      h('h1', null, `${MESES[mes - 1][0].toUpperCase() + MESES[mes - 1].slice(1)} de ${ano}`),
      h('div', { class: 'cabeca__acoes' },
        h('a', { class: 'botao botao--fantasma botao--pequeno', href: `#/calendario/${ant}` }, '← Mês anterior'),
        h('a', { class: 'botao botao--fantasma botao--pequeno', href: '#/calendario' }, 'Hoje'),
        h('a', { class: 'botao botao--fantasma botao--pequeno', href: `#/calendario/${prox}` }, 'Próximo mês →')))),
    h('section', null, h('div', { class: 'miolo calendario' },
      h('div', { class: 'cal' },
        ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => h('span', { class: 'cal__semana' }, d)),
        dias.map((d) => h('a', {
          class: 'cal__dia' + (d.doMes ? '' : ' cal__dia--fora') + (d.n === ctx.hojeLit.n ? ' cal__dia--hoje' : '') + (d.doMes && d.dia === escolhido ? ' cal__dia--escolhido' : ''),
          href: d.doMes ? `#/calendario/${ano}-${String(mes).padStart(2, '0')}?dia=${d.dia}` : `#/calendario/${d.ano}-${String(d.mes).padStart(2, '0')}?dia=${d.dia}`,
          style: `--cor:${d.corHex}`,
          'aria-label': `${d.dia}: ${d.nome}`,
        },
        h('span', { class: 'cal__num' }, d.dia),
        d.celebracao && ['solenidade', 'solenidadePropria', 'festa', 'festaDoSenhor', 'memoria', 'privilegiado', 'triduo'].includes(d.celebracao.grau) ? h('span', { class: 'cal__nome' }, encurtar(d.celebracao.nome)) : null,
        d.jejum ? h('span', { class: 'cal__marca' }, 'jejum') : null))),
      h('aside', { class: 'cal__detalhe cartao' },
        h('p', { class: 'rotulo rotulo--lit' }, dataPorExtenso(detalhe.n)),
        h('h3', null, detalhe.nome),
        h('p', { class: 'texto-fraco' }, [detalhe.celebracao ? GRAU[detalhe.celebracao.grau] : null, `${detalhe.nomeTempo}`, `Ano ${detalhe.ciclo.domingos}, ciclo ${detalhe.ciclo.semana}`].filter(Boolean).join(' · ')),
        h('p', null, h('span', { class: 'bolinha', style: `background:${detalhe.corHex};margin-right:.4rem` }), `Cor: ${detalhe.cor}`),
        detalhe.outras.length ? h('p', { class: 'texto-fraco' }, 'Também: ', detalhe.outras.map((o) => o.nome + (o.comemoracao ? ' (comemoração)' : ` (${(GRAU[o.grau] || '').toLowerCase()})`)).join('; ')) : null,
        h('div', { style: 'display:flex;gap:.4rem;flex-wrap:wrap' },
          detalhe.preceito ? h('span', { class: 'chip chip--lit' }, 'dia de preceito') : null,
          detalhe.jejum ? h('span', { class: 'chip' }, 'jejum e abstinência') : detalhe.abstinencia ? h('span', { class: 'chip' }, 'abstinência ou outra penitência') : null)))),
    h('section', null, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, `Em ${MESES[mes - 1]}`),
      destaques.length ? h('ul', { class: 'lista-limpa divisor', style: 'max-width:48rem' }, destaques.map((d) => h('li', { style: 'display:flex;gap:1rem;align-items:baseline;padding:.6rem 0' },
        h('span', { class: 'bolinha', style: `background:${d.corHex}` }),
        h('span', { style: 'min-width:6.5rem;color:var(--sobre-tinta-3)' }, `${d.dia} · ${d.diaSemana.split('-')[0]}`),
        h('span', null, d.nome), d.jejum ? h('span', { class: 'chip', style: 'margin-left:auto' }, 'jejum') : null)))
        : h('p', { class: 'texto-fraco' }, 'Nenhuma solenidade ou festa neste mês, só memórias e dias comuns.'))),
    h('section', null, h('div', { class: 'miolo' },
      h('div', { class: 'grade grade--larga' },
        h('div', null, h('p', { class: 'rotulo' }, 'As cores'),
          h('ul', { class: 'lista-limpa', style: 'display:grid;gap:.5rem;margin-top:.6rem' }, [
            ['verde', 'Tempo Comum: esperança, a vida que cresce.'],
            ['roxo', 'Advento e Quaresma: preparação e penitência; também finados.'],
            ['branco', 'Natal, Páscoa, festas do Senhor, de Nossa Senhora e dos santos que não foram mártires (aqui aparece dourado).'],
            ['vermelho', 'Paixão, Pentecostes, apóstolos e mártires.'],
            ['rosa', 'Alegria no meio da espera: 3º domingo do Advento e 4º da Quaresma.'],
          ].map(([c, t]) => h('li', { style: 'display:flex;gap:.6rem;align-items:baseline' }, h('span', { class: 'bolinha', style: `background:${CORES[c].hex}` }), h('span', null, h('b', null, c), ' · ', t))))),
        h('div', null, h('p', { class: 'rotulo' }, `Datas de ${ano}`),
          h('ul', { class: 'lista-limpa', style: 'display:grid;gap:.35rem;margin-top:.6rem' }, [
            ['Quarta-feira de Cinzas', D.cinzas], ['Domingo de Ramos', D.ramos], ['Páscoa', D.pascoa], ['Ascensão (no Brasil, domingo)', D.ascensao],
            ['Pentecostes', D.pentecostes], ['Corpus Christi', D.corpusChristi], ['Cristo Rei', D.cristoRei], ['1º Domingo do Advento', D.advento],
          ].map(([nome, n]) => h('li', null, h('b', null, p(n)), ' · ', nome))))),
      h('p', { class: 'texto-fraco', style: 'margin-top:1.6rem;font-size:.88rem' }, 'Calculado aqui com as regras do calendário romano e o próprio do Brasil (Epifania, Ascensão, São Pedro e São Paulo, Assunção e Todos os Santos no domingo). Os santos vêm do romcal. Leituras do dia: site da CNBB. Dias de preceito: domingos, 1º de janeiro, Corpus Christi, 8 de dezembro e Natal.'))),
  ] };
}

function encurtar(nome) {
  return nome.replace(/^(São|Santa|Santo|Santos|Beatos?|Nossa Senhora)\s/, (m) => m).replace(/,.*$/, '').replace(/^Bem-aventurada Virgem Maria/, 'Maria');
}
