// O que a pessoa marcou, guardado só neste navegador (localStorage).
// Recebe o "armazém" de fora para os testes poderem usar um de mentira.

export const CHAVE = 'colinha-de-pecados:v1';
export const MAX_VEZES = 99;
export const MAX_NOTA = 120;
export const MAX_ULTIMA = 60;

function limitarVezes(valor) {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_VEZES);
}

export function criarEstado(armazem = null, idsValidos = null) {
  const ouvintes = new Set();
  const dados = { marcas: {}, ultima: '' };
  let gravou = armazem !== null;

  function ler() {
    if (!armazem) return;
    try {
      const bruto = armazem.getItem(CHAVE);
      if (!bruto) return;
      const lido = JSON.parse(bruto);
      if (!lido || typeof lido !== 'object') return;
      for (const [id, marca] of Object.entries(lido.marcas || {})) {
        // id que não existe mais na lista (item removido numa versão nova) é ignorado
        if (idsValidos && !idsValidos.has(id)) continue;
        dados.marcas[id] = {
          n: limitarVezes(marca?.n),
          nota: String(marca?.nota ?? '').slice(0, MAX_NOTA),
        };
      }
      dados.ultima = String(lido.ultima ?? '').slice(0, MAX_ULTIMA);
    } catch {
      // guardado corrompido: começa vazio, sem derrubar a página
    }
  }

  function gravar() {
    if (!armazem) {
      gravou = false;
      return;
    }
    try {
      armazem.setItem(CHAVE, JSON.stringify(dados));
      gravou = true;
    } catch {
      gravou = false;
    }
  }

  function mudou() {
    gravar();
    for (const ouvinte of ouvintes) ouvinte();
  }

  ler();

  return {
    // false quando o navegador não deixa guardar (janela privada, dados bloqueados)
    get persistente() {
      return gravou;
    },
    marcado: (id) => id in dados.marcas,
    marca: (id) => dados.marcas[id] ?? null,
    get ultima() {
      return dados.ultima;
    },
    get marcas() {
      return dados.marcas;
    },
    alternar(id, forcar) {
      const quer = forcar === undefined ? !(id in dados.marcas) : forcar;
      if (quer && !(id in dados.marcas)) dados.marcas[id] = { n: 1, nota: '' };
      else if (!quer && id in dados.marcas) delete dados.marcas[id];
      else return;
      mudou();
    },
    definirVezes(id, valor) {
      if (!(id in dados.marcas)) return;
      dados.marcas[id].n = limitarVezes(valor);
      mudou();
    },
    definirNota(id, texto) {
      if (!(id in dados.marcas)) return;
      dados.marcas[id].nota = String(texto).slice(0, MAX_NOTA);
      mudou();
    },
    definirUltima(texto) {
      dados.ultima = String(texto).slice(0, MAX_ULTIMA);
      mudou();
    },
    limpar() {
      dados.marcas = {};
      dados.ultima = '';
      mudou();
    },
    assinar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
  };
}
