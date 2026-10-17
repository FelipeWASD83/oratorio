// vistas/plano.js: o plano de leitura dos 73 livros, a leitura de hoje e a junção com a nova aba.

import { h, plural, dataCurta } from '../util.js';
import { dados } from '../api.js';
import { ctx, lidos, marcarLidos, nomeDoCapitulo, sincronizarNovaAba, quandoFoi, toast } from '../contexto.js';
import { ETAPAS, TRILHAS_DIARIAS, RITMOS } from '../plano.js';
import { partes } from '../liturgia.js';
import * as ponte from '../ponte.js';
import { reRender } from '../main.js';

const abertos = new Set();

export async function render() {
  const conjunto = await lidos();
  const p = ctx.plano;
  const config = await dados.listar('config');
  const ritmo = (config.plano && config.plano.ritmo) || 2;
  const total = p.progressoTotal(conjunto);
  const etapa = p.etapaAtual(conjunto);
  const est = p.estimativa(conjunto, ritmo);
  const hj = partes(ctx.hojeLit.n);
  const dia = `${hj.ano}-${String(hj.mes).padStart(2, '0')}-${String(hj.dia).padStart(2, '0')}`;
  const leitura = p.leituraDeHoje(conjunto, ritmo, config.hoje, dia);
  const extensao = await ponte.extensao();

  const cabeca = h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'A Palavra · plano de leitura'),
    h('h1', null, `${(total.fracao * 100).toFixed(1).replace('.', ',')}% da Bíblia`),
    h('p', { class: 'cabeca__sub' }, `${plural(total.feitos, 'capítulo lido', 'capítulos lidos')} de ${total.total.toLocaleString('pt-BR')}. ${etapa ? `Etapa atual: ${etapa.nome}.` : 'O plano principal terminou.'} No ritmo de ${ritmo} por dia, ele termina em ${dataCurta(est.termina)}.`),
    h('div', { class: 'barra', style: 'max-width:40rem;margin-top:1.4rem;height:8px' }, h('span', { style: `width:${(total.fracao * 100).toFixed(2)}%` })),
    h('div', { class: 'cabeca__acoes' }, leitura.itens.map((i) => {
      const [cod, cap] = i.ref.split('.');
      return h('a', { class: conjunto.has(i.ref) ? 'chip' : 'chip chip--lit', href: `#/biblia/${cod}/${cap}` }, conjunto.has(i.ref) ? '✓ ' : '', nomeDoCapitulo(cod, Number(cap)));
    }))));

  const etapas = h('section', null, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'A trilha principal · 19 etapas'),
    h('h2', { class: 'titulo-secao' }, 'Numa ordem fácil: ', h('em', null, 'história antes de doutrina, curto antes de longo')),
    h('ol', { class: 'lista-limpa etapas' }, ETAPAS.map((e, i) => {
      const k = p.contar(conjunto, e.livros);
      const atual = etapa && etapa.id === e.id;
      const aberto = abertos.has(e.id) || (atual && !abertos.has('-' + e.id));
      return h('li', { class: 'etapa' + (atual ? ' etapa--atual' : '') + (k.feitos === k.total ? ' etapa--feita' : '') },
        h('button', { class: 'etapa__cabeca', type: 'button', 'aria-expanded': String(aberto), onclick: () => { if (aberto) { abertos.delete(e.id); abertos.add('-' + e.id); } else { abertos.add(e.id); abertos.delete('-' + e.id); } reRender(); } },
          h('span', { class: 'etapa__num' }, String(i + 1).padStart(2, '0')),
          h('span', { class: 'etapa__nome' }, e.nome, h('small', null, e.livros.map((c) => ctx.porCodigo.get(c).abrev).join(' · '))),
          h('span', { class: 'etapa__conta' }, `${k.feitos}/${k.total}`),
          h('span', { class: 'barra etapa__barra' }, h('span', { style: `width:${(k.fracao * 100).toFixed(1)}%` }))),
        aberto ? h('div', { class: 'etapa__corpo' },
          h('p', { class: 'texto-fraco' }, e.porque),
          e.livros.map((c) => grade(c, conjunto))) : null);
    }))));

  const diarias = h('section', null, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Em paralelo · um de cada por dia'),
    h('div', { class: 'grade grade--larga' }, TRILHAS_DIARIAS.map((t) => {
      const k = p.contar(conjunto, t.livros);
      return h('div', { class: 'cartao' }, h('h3', null, t.nome), h('p', { class: 'texto-fraco' }, t.porque),
        h('div', { class: 'barra' }, h('span', { style: `width:${(k.fracao * 100).toFixed(1)}%` })), h('p', { class: 'texto-fraco' }, `${k.feitos} de ${k.total}`),
        abertos.has(t.id) ? grade(t.livros[0], conjunto) : h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', onclick: () => { abertos.add(t.id); reRender(); } }, 'Ver os capítulos'));
    }),
    h('div', { class: 'cartao' }, h('h3', null, 'Ritmo'),
      h('p', { class: 'texto-fraco' }, 'Quantos capítulos da trilha principal por dia (fora o Salmo e o Provérbio).'),
      h('div', { style: 'display:flex;gap:.4rem;flex-wrap:wrap' }, RITMOS.map((n) => h('button', { class: n === ritmo ? 'botao botao--pequeno' : 'botao botao--fantasma botao--pequeno', type: 'button', onclick: async () => { await dados.gravar('config', 'plano', { ritmo: n }); await dados.apagar('config', 'hoje').catch(() => {}); reRender(); } }, `${n} por dia`))),
      h('p', { class: 'texto-fraco' }, `Faltam ${plural(est.faltam, 'capítulo', 'capítulos')} na trilha principal: ${plural(est.dias, 'dia', 'dias')}.`)))));

  const novaAba = h('section', null, h('div', { class: 'miolo miolo--estreito leitura' },
    h('p', { class: 'rotulo' }, 'Junto com a nova aba'),
    h('h2', { class: 'titulo-secao' }, 'O balão Bíblia da nova aba ', h('em', null, 'e este plano são o mesmo')),
    h('p', null, 'O que você marca aqui aparece marcado lá, e o contrário também (inclusive desmarcar). Os sete livros católicos ficam só aqui, porque a nova aba conta os 66 das Bíblias protestantes; os Salmos, Joel e Malaquias são convertidos de uma numeração para a outra.'),
    extensao
      ? h('p', null, `Nova aba ${extensao} encontrada. Última junção: ${quandoFoi(ctx.sincroniaNovaAba.quando)}${ctx.sincroniaNovaAba.erro ? ` (erro: ${ctx.sincroniaNovaAba.erro})` : ''}. `,
        h('button', { class: 'botao-texto', type: 'button', onclick: async () => { const r = await sincronizarNovaAba(); toast(r.ok ? `Juntado: ${r.trouxe} trazidos, ${r.tirou} tirados.` : `Não deu: ${r.motivo}`); reRender(); } }, 'Juntar agora'))
      : h('p', { class: 'texto-fraco' }, 'A extensão da nova aba não está neste navegador (no celular ela não existe). A junção acontece quando o Oratório é aberto no Brave do PC; daqui, o que você marcar vai pelo servidor de casa.')));

  return { titulo: 'Plano de leitura', secoes: [cabeca, etapas, diarias, novaAba] };
}

function grade(cod, conjunto) {
  const l = ctx.porCodigo.get(cod);
  const caps = Array.from({ length: l.capitulos }, (_, i) => i + 1);
  const todos = caps.every((c) => conjunto.has(`${cod}.${c}`));
  return h('div', { class: 'grade-livro' },
    h('div', { class: 'grade-livro__topo' },
      h('a', { href: `#/biblia/${cod}/1` }, l.nome),
      h('button', { class: 'botao-texto', type: 'button', style: 'font-size:.85rem', onclick: async () => { await marcarLidos(caps.map((c) => `${cod}.${c}`), !todos); reRender(); } }, todos ? 'desmarcar o livro' : 'marcar o livro todo')),
    h('div', { class: 'capitulos capitulos--compacto' }, caps.map((c) => {
      const ref = `${cod}.${c}`;
      const feito = conjunto.has(ref);
      return h('button', { type: 'button', class: 'capitulo' + (feito ? ' capitulo--lido' : ''), 'aria-pressed': String(feito), 'aria-label': `${l.nome} ${c}`, onclick: async (e) => {
        e.currentTarget.classList.toggle('capitulo--lido');
        await marcarLidos([ref], !feito);
        reRender();
      } }, c);
    })));
}
