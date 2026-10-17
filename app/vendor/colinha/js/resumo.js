// Conta o que foi marcado e monta a lista que vai para a colinha exportada.
// Não mexe em DOM: recebe as seções (dados/pecados.js) e o estado.

// Lista dos marcados na ordem do exame (mandamento por mandamento).
export function marcados(secoes, estado) {
  const lista = [];
  for (const secao of secoes) {
    for (const item of secao.itens) {
      const marca = estado.marca(item.id);
      if (!marca) continue;
      lista.push({
        id: item.id,
        t: item.t,
        g: item.g,
        vezes: marca.n,
        nota: marca.nota,
        secaoId: secao.id,
        secaoNum: secao.num,
        secaoTitulo: secao.titulo,
      });
    }
  }
  return lista;
}

// Totais por gravidade da matéria. "vezes" não entra: contamos itens, não ocorrências.
export function resumir(secoes, estado) {
  const total = { g: 0, d: 0, l: 0, todos: 0, porSecao: {} };
  for (const item of marcados(secoes, estado)) {
    total[item.g] += 1;
    total.todos += 1;
    total.porSecao[item.secaoId] = (total.porSecao[item.secaoId] ?? 0) + 1;
  }
  return total;
}
