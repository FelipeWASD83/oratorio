// Monta a folha exportada (PNG e PDF saem desta mesma montagem).
//
// Não desenha nada: devolve páginas com "ops" (texto, linha, caixa) em
// coordenadas com a origem no canto de cima à esquerda. Quem desenha é o
// exportar.js (canvas, para o PNG) ou o pdf.js (arquivo PDF). Cada um passa a sua própria
// função `medir`, porque a quebra de linha depende da fonte de quem desenha.
//
// Todas as medidas saem de `corpo` (o tamanho da letra do texto corrido), então
// a mesma montagem serve para 27 px no PNG e 11,5 pt no PDF.

import { dataExtenso, plural } from './util.js';
import { ATO_DE_CONTRICAO } from '../dados/pecados.js';

const FONTES = { normal: 'normal', italico: 'italico', negrito: 'negrito' };

export function quebrarLinhas(texto, fonte, tam, larguraMax, medir) {
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (!atual || medir(fonte, tam, tentativa) <= larguraMax) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

export function montarFolha(dados, medir, cfg) {
  const { largura, altura = Infinity, corpo } = cfg;
  const margem = cfg.margem ?? {
    esq: corpo * 3.4,
    dir: corpo * 2.4,
    topo: corpo * 2.8,
    base: corpo * 3,
  };
  const larguraUtil = largura - margem.esq - margem.dir;
  const entrelinha = corpo * 1.36;
  const recuo = corpo * 1.55;

  const paginas = [{ ops: [] }];
  let y = margem.topo;

  const pagina = () => paginas[paginas.length - 1];
  const ops = (op) => pagina().ops.push(op);

  function garantir(altura_) {
    if (y > margem.topo + 1 && y + altura_ > altura - margem.base) {
      paginas.push({ ops: [] });
      y = margem.topo;
    }
  }

  function texto(x, baseline, fonte, tam, cor, str, espaco = 0) {
    ops({ tipo: 'texto', x, y: baseline, fonte: FONTES[fonte], tam, cor, texto: str, espaco });
  }

  function marcador(x, topo, grav) {
    const lado = corpo * 0.6;
    const cor = grav === 'l' ? 'tinta' : 'rubrica';
    ops({ tipo: 'caixa', x, y: topo, w: lado, h: lado, cor, cheia: grav === 'g' });
  }

  // ---- cabeçalho ----
  const tamTitulo = corpo * 1.95;
  texto(margem.esq, y + tamTitulo, 'negrito', tamTitulo, 'tinta', 'Colinha para a confissão');
  y += tamTitulo * 1.3;
  texto(margem.esq, y + corpo * 0.9, 'italico', corpo * 0.9, 'suave', dataExtenso(dados.data ?? new Date()));
  y += corpo * 1.5;
  ops({ tipo: 'linha', x1: margem.esq, y1: y, x2: largura - margem.dir, y2: y, cor: 'rubrica', esp: Math.max(1, corpo * 0.07) });
  y += corpo * 1.1;

  const ultima = (dados.ultima ?? '').trim() || '________________';
  const abertura = `Abençoe-me, Padre, porque pequei. A minha última confissão foi há ${ultima}.`;
  for (const linha of quebrarLinhas(abertura, 'italico', corpo, larguraUtil, medir)) {
    texto(margem.esq, y + corpo, 'italico', corpo, 'tinta', linha);
    y += entrelinha;
  }
  y += corpo * 0.3;

  const graves = dados.itens.filter((i) => i.g === 'g').length;
  const duvida = dados.itens.filter((i) => i.g === 'd').length;
  const leves = dados.itens.filter((i) => i.g === 'l').length;
  const resumo =
    `${graves} ${plural(graves, 'item de matéria grave', 'itens de matéria grave')}, ` +
    `${duvida} ${plural(duvida, 'que pode ser grave', 'que podem ser graves')} e ` +
    `${leves} ${plural(leves, 'leve', 'leves')}.`;
  texto(margem.esq, y + corpo * 0.95, 'normal', corpo * 0.95, 'suave', resumo);
  y += corpo * 1.6;

  // legenda das marcas: sem ela, quadrado cheio e vazado não dizem nada
  const tamLegenda = corpo * 0.82;
  let xLegenda = margem.esq;
  for (const [grav, rotulo] of [['g', 'matéria grave'], ['d', 'pode ser grave'], ['l', 'leve']]) {
    marcador(xLegenda, y + corpo * 0.12, grav);
    texto(xLegenda + corpo * 0.85, y + tamLegenda, 'italico', tamLegenda, 'suave', rotulo);
    xLegenda += corpo * 0.85 + medir('italico', tamLegenda, rotulo) + corpo * 1.8;
  }
  y += corpo * 2.1;

  // ---- blocos de pecados ----
  const blocos = [
    { titulo: 'GRAVES E QUE PODEM SER GRAVES', itens: dados.itens.filter((i) => i.g !== 'l') },
    { titulo: 'LEVES', itens: dados.itens.filter((i) => i.g === 'l') },
  ];

  const tamSecao = corpo * 0.78;
  const tamNota = corpo * 0.9;
  const larguraTexto = larguraUtil - recuo;

  function alturaItem(item) {
    const linhas = quebrarLinhas(itemTexto(item), 'normal', corpo, larguraTexto, medir).length;
    let h = linhas * entrelinha;
    if (item.nota?.trim()) h += quebrarLinhas(`Obs.: ${item.nota.trim()}`, 'italico', tamNota, larguraTexto, medir).length * tamNota * 1.38;
    return h + corpo * 0.5;
  }

  for (const bloco of blocos) {
    if (!bloco.itens.length) continue;
    garantir(corpo * 3 + alturaItem(bloco.itens[0]));
    texto(margem.esq, y + corpo * 0.9, 'negrito', corpo * 0.9, 'rubrica', bloco.titulo, corpo * 0.12);
    y += corpo * 1.9;

    let secaoAtual = null;
    for (const item of bloco.itens) {
      if (item.secaoId !== secaoAtual) {
        garantir(corpo * 2 + alturaItem(item));
        secaoAtual = item.secaoId;
        y += corpo * 0.35;
        texto(margem.esq, y + tamSecao, 'negrito', tamSecao, 'suave', `${item.secaoNum} · ${item.secaoTitulo}`.toUpperCase(), corpo * 0.06);
        y += tamSecao * 1.9;
      }
      garantir(alturaItem(item));
      marcador(margem.esq, y + corpo * 0.3, item.g);
      const linhas = quebrarLinhas(itemTexto(item), 'normal', corpo, larguraTexto, medir);
      for (const linha of linhas) {
        texto(margem.esq + recuo, y + corpo, 'normal', corpo, 'tinta', linha);
        y += entrelinha;
      }
      if (item.nota?.trim()) {
        for (const linha of quebrarLinhas(`Obs.: ${item.nota.trim()}`, 'italico', tamNota, larguraTexto, medir)) {
          texto(margem.esq + recuo, y + tamNota * 0.95, 'italico', tamNota, 'suave', linha);
          y += tamNota * 1.38;
        }
      }
      y += corpo * 0.5;
    }
    y += corpo * 1.1;
  }

  // ---- fecho ----
  const contricao = quebrarLinhas(ATO_DE_CONTRICAO, 'italico', corpo * 0.95, larguraUtil, medir);
  const aviso = quebrarLinhas(
    'Esta folha só lista matéria. Quem julga se um pecado é mortal é o confessor, com as três condições: matéria grave, pleno conhecimento e consentimento deliberado (Catecismo, 1857).',
    'normal',
    corpo * 0.8,
    larguraUtil,
    medir,
  );
  garantir(corpo * 6 + contricao.length * corpo * 1.3 + aviso.length * corpo * 1.1);
  y += corpo * 0.4;
  ops({ tipo: 'linha', x1: margem.esq, y1: y, x2: largura - margem.dir, y2: y, cor: 'suave', esp: Math.max(0.6, corpo * 0.035) });
  y += corpo * 1.1;
  texto(margem.esq, y + corpo * 0.8, 'negrito', corpo * 0.8, 'suave', 'ATO DE CONTRIÇÃO', corpo * 0.1);
  y += corpo * 1.7;
  for (const linha of contricao) {
    texto(margem.esq, y + corpo * 0.95, 'italico', corpo * 0.95, 'tinta', linha);
    y += corpo * 1.3;
  }
  y += corpo * 0.9;
  for (const linha of aviso) {
    texto(margem.esq, y + corpo * 0.8, 'normal', corpo * 0.8, 'suave', linha);
    y += corpo * 1.1;
  }

  return { paginas, margem, alturaTotal: y + margem.base };
}

function itemTexto(item) {
  return item.vezes > 1 ? `${item.t} (${item.vezes} vezes)` : item.t;
}
