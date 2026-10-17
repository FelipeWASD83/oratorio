// Gerador de PDF mínimo, sem dependência: pega as páginas montadas pelo
// folha.js e escreve um arquivo com texto de verdade (dá para selecionar e
// copiar), usando as fontes padrão do PDF (Times), que todo leitor já tem.
//
// Tudo que entra no arquivo é ASCII: letras com acento viram escape octal
// (\347 = ç), então o PDF inteiro cabe numa string e o tamanho em bytes é o
// tamanho da string, o que torna a tabela de endereços (xref) trivial.

export const A4 = { largura: 595.28, altura: 841.89 };

const FONTES_PDF = {
  normal: { id: 'F1', base: 'Times-Roman' },
  italico: { id: 'F2', base: 'Times-Italic' },
  negrito: { id: 'F3', base: 'Times-Bold' },
};

const CORES = {
  tinta: [0.11, 0.094, 0.078],
  rubrica: [0.647, 0.133, 0.106],
  suave: [0.357, 0.314, 0.267],
};

// Caracteres fora de Latin-1 que existem no WinAnsi (cp1252).
const ESPECIAIS = {
  '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
};

export function escaparTexto(texto) {
  let saida = '';
  // NFC junta letra e acento separados (texto colado do macOS) antes de mapear
  for (const ch of String(texto).normalize('NFC')) {
    const codigo = ch.codePointAt(0);
    let byte;
    if (codigo < 0x80) byte = codigo;
    else if (codigo >= 0xa0 && codigo <= 0xff) byte = codigo;
    else byte = ESPECIAIS[ch] ?? 0x3f; // o que não existe vira "?"
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) saida += `\\${String.fromCharCode(byte)}`;
    else if (byte < 0x20 || byte > 0x7e) saida += `\\${byte.toString(8).padStart(3, '0')}`;
    else saida += String.fromCharCode(byte);
  }
  return saida;
}

const num = (n) => (Math.round(n * 100) / 100).toString();
const cor = (nome) => CORES[nome].map((c) => num(c)).join(' ');

function conteudoDaPagina(pagina, alturaPt, numero, total, margem) {
  const out = [];
  // regra vermelha na margem, como nos missais
  out.push(`${cor('rubrica')} RG 0.9 w ${num(margem.esq - 14)} ${num(alturaPt - margem.topo + 6)} m ${num(margem.esq - 14)} ${num(margem.base - 8)} l S`);
  for (const op of pagina.ops) {
    if (op.tipo === 'texto') {
      const f = FONTES_PDF[op.fonte];
      out.push(
        // Tc (espaço entre letras) vale até ser trocado: sempre escrito, senão o dos títulos vaza para o resto
        `BT /${f.id} ${num(op.tam)} Tf ${cor(op.cor)} rg ${num(op.espaco ?? 0)} Tc ${num(op.x)} ${num(alturaPt - op.y)} Td (${escaparTexto(op.texto)}) Tj ET`,
      );
    } else if (op.tipo === 'linha') {
      out.push(`${cor(op.cor)} RG ${num(op.esp)} w ${num(op.x1)} ${num(alturaPt - op.y1)} m ${num(op.x2)} ${num(alturaPt - op.y2)} l S`);
    } else if (op.tipo === 'caixa') {
      const yBase = alturaPt - op.y - op.h;
      if (op.cheia) out.push(`${cor(op.cor)} rg ${num(op.x)} ${num(yBase)} ${num(op.w)} ${num(op.h)} re f`);
      else out.push(`${cor(op.cor)} RG 0.8 w ${num(op.x + 0.4)} ${num(yBase + 0.4)} ${num(op.w - 0.8)} ${num(op.h - 0.8)} re S`);
    }
  }
  const rodape = `${numero} / ${total}`;
  out.push(`BT /${FONTES_PDF.normal.id} 8.5 Tf ${cor('suave')} rg 0 Tc ${num(A4.largura / 2 - 12)} ${num(margem.base * 0.45)} Td (${rodape}) Tj ET`);
  return out.join('\n');
}

export function gerarPdf(paginas, { titulo = 'Colinha para a confissao', margem }) {
  const objetos = []; // índice 0 = objeto 1
  const adicionar = (corpo) => objetos.push(corpo) && objetos.length;

  // 1 catálogo, 2 páginas (preenchido no fim), 3-5 fontes
  adicionar('<< /Type /Catalog /Pages 2 0 R >>');
  adicionar('');
  for (const f of Object.values(FONTES_PDF)) {
    adicionar(`<< /Type /Font /Subtype /Type1 /BaseFont /${f.base} /Encoding /WinAnsiEncoding >>`);
  }
  const recursos = `<< /Font << ${Object.values(FONTES_PDF)
    .map((f, i) => `/${f.id} ${3 + i} 0 R`)
    .join(' ')} >> >>`;

  const filhos = [];
  paginas.forEach((pagina, i) => {
    const fluxo = conteudoDaPagina(pagina, A4.altura, i + 1, paginas.length, margem);
    const idConteudo = adicionar(`<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`);
    const idPagina = adicionar(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.largura} ${A4.altura}] /Resources ${recursos} /Contents ${idConteudo} 0 R >>`,
    );
    filhos.push(`${idPagina} 0 R`);
  });
  objetos[1] = `<< /Type /Pages /Kids [${filhos.join(' ')}] /Count ${paginas.length} >>`;
  const idInfo = adicionar(`<< /Title (${escaparTexto(titulo)}) /Producer (colinha-de-pecados) >>`);

  let arquivo = '%PDF-1.4\n';
  const enderecos = [];
  objetos.forEach((corpo, i) => {
    enderecos.push(arquivo.length);
    arquivo += `${i + 1} 0 obj\n${corpo}\nendobj\n`;
  });
  const inicioXref = arquivo.length;
  arquivo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const e of enderecos) arquivo += `${String(e).padStart(10, '0')} 00000 n \n`;
  arquivo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info ${idInfo} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return new TextEncoder().encode(arquivo);
}
