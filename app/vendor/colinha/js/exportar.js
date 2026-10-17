// Exportação no navegador: PNG (desenhado num canvas com a mesma fonte do
// site) e PDF (texto de verdade, pelo pdf.js). A montagem é a do folha.js.

import { montarFolha } from './folha.js';
import { A4, gerarPdf } from './pdf.js';
import { dataArquivo } from './util.js';

const CORES_PNG = { tinta: '#1c1814', rubrica: '#a5221b', suave: '#5b5044' };
const PAPEL = '#f5edda';
const MARGEM_PDF = { esq: 62, dir: 50, topo: 58, base: 62 };
const LARGURA_PNG = 1080;
const AREA_MAX_PX = 16_000_000; // o Safari do iPhone recusa canvas acima de ~16,7 milhões de pixels

function fonteCss(familia, fonte, tam) {
  const estilo = fonte === 'italico' ? 'italic ' : '';
  const peso = fonte === 'negrito' ? 600 : 400;
  return `${estilo}${peso} ${tam}px ${familia}`;
}

// Mede com tamanho 100 e escala: evita o arredondamento de tamanhos pequenos.
function criarMedidor(familia) {
  const ctx = document.createElement('canvas').getContext('2d');
  return (fonte, tam, texto) => {
    ctx.font = fonteCss(familia, fonte, 100);
    return (ctx.measureText(texto).width * tam) / 100;
  };
}

const FAMILIA_PNG = '"EB Garamond", Garamond, "Times New Roman", serif';
const FAMILIA_PDF = '"Times New Roman", Times, serif';

async function carregarFontes() {
  const pedidos = ['400 20px "EB Garamond"', 'italic 400 20px "EB Garamond"', '600 20px "EB Garamond"'];
  await Promise.all(pedidos.map((p) => document.fonts.load(p, 'Áãç§×')));
}

export async function gerarPng(dados) {
  await carregarFontes();
  const folha = montarFolha(dados, criarMedidor(FAMILIA_PNG), { largura: LARGURA_PNG, corpo: 27 });
  const altura = Math.ceil(folha.alturaTotal);
  // 2x quando cabe; senão a maior escala que respeita a área (e a altura de 16.000 px)
  const escala = Math.min(2, Math.sqrt(AREA_MAX_PX / (LARGURA_PNG * altura)), 16000 / altura);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(LARGURA_PNG * escala);
  canvas.height = Math.round(altura * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('o navegador não conseguiu criar a imagem');
  ctx.scale(escala, escala);

  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, LARGURA_PNG, altura);
  ctx.strokeStyle = CORES_PNG.rubrica;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(folha.margem.esq - 26, folha.margem.topo - 10);
  ctx.lineTo(folha.margem.esq - 26, altura - folha.margem.base + 10);
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  for (const op of folha.paginas[0].ops) {
    if (op.tipo === 'texto') {
      ctx.font = fonteCss(FAMILIA_PNG, op.fonte, op.tam);
      ctx.letterSpacing = op.espaco ? `${op.espaco}px` : '0px';
      ctx.fillStyle = CORES_PNG[op.cor];
      ctx.fillText(op.texto, op.x, op.y);
    } else if (op.tipo === 'linha') {
      ctx.strokeStyle = CORES_PNG[op.cor];
      ctx.lineWidth = op.esp;
      ctx.beginPath();
      ctx.moveTo(op.x1, op.y1);
      ctx.lineTo(op.x2, op.y2);
      ctx.stroke();
    } else if (op.tipo === 'caixa') {
      ctx.fillStyle = CORES_PNG[op.cor];
      ctx.strokeStyle = CORES_PNG[op.cor];
      ctx.lineWidth = 1.6;
      if (op.cheia) ctx.fillRect(op.x, op.y, op.w, op.h);
      else ctx.strokeRect(op.x + 0.8, op.y + 0.8, op.w - 1.6, op.h - 1.6);
    }
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('o navegador não conseguiu gerar o PNG (a lista é grande demais?)');
  return blob;
}

export function gerarPdfBytes(dados) {
  const folha = montarFolha(dados, criarMedidor(FAMILIA_PDF), {
    largura: A4.largura,
    altura: A4.altura,
    corpo: 11.5,
    margem: MARGEM_PDF,
  });
  return gerarPdf(folha.paginas, { margem: MARGEM_PDF });
}

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function baixarPng(dados) {
  baixar(await gerarPng(dados), `colinha-de-pecados-${dataArquivo()}.png`);
}

export function baixarPdf(dados) {
  baixar(new Blob([gerarPdfBytes(dados)], { type: 'application/pdf' }), `colinha-de-pecados-${dataArquivo()}.pdf`);
}
