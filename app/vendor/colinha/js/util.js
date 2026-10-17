// Funções pequenas, sem DOM, usadas por mais de um módulo.

// Tira acento e põe em minúsculas, para a busca achar "confissao" em "confissão".
export function semAcento(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function dataExtenso(data = new Date()) {
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// 2026-10-07, para o nome do arquivo baixado.
export function dataArquivo(data = new Date()) {
  const dois = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

export function plural(n, singular, pluralTexto) {
  return n === 1 ? singular : pluralTexto;
}
