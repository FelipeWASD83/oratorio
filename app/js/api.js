// api.js: a conversa com o servidor do Oratório.

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

async function pedir(metodo, caminho, corpo) {
  let r;
  try {
    r = await fetch(caminho, {
      method: metodo,
      headers: corpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ErroApi('Sem conexão com o servidor do Oratório. Ele está aberto?', 0);
  }
  let dados = null;
  try { dados = await r.json(); } catch { /* resposta sem corpo */ }
  if (!r.ok) throw new ErroApi((dados && dados.erro) || `Erro ${r.status}`, r.status);
  return dados;
}

export const api = {
  get: (c) => pedir('GET', c),
  post: (c, corpo = {}) => pedir('POST', c, corpo),
  put: (c, corpo = {}) => pedir('PUT', c, corpo),
  del: (c) => pedir('DELETE', c),
};

/** Dados de quem usa: coleções do servidor, com cache em memória por página. */
const cache = new Map();
export const dados = {
  async listar(colecao, { recarregar = false } = {}) {
    if (!recarregar && cache.has(colecao)) return cache.get(colecao);
    const r = await api.get('/api/dados/' + colecao);
    cache.set(colecao, r.itens || {});
    return cache.get(colecao);
  },
  async gravar(colecao, id, valor) {
    await api.put(`/api/dados/${colecao}/${encodeURIComponent(id)}`, { valor });
    if (cache.has(colecao)) cache.get(colecao)[id] = valor;
  },
  async apagar(colecao, id) {
    await api.del(`/api/dados/${colecao}/${encodeURIComponent(id)}`);
    if (cache.has(colecao)) delete cache.get(colecao)[id];
  },
  async lote(colecao, itens) {
    if (!Object.keys(itens).length) return;
    await api.post(`/api/dados/${colecao}/lote`, { itens });
    if (cache.has(colecao)) {
      const c = cache.get(colecao);
      for (const [k, v] of Object.entries(itens)) { if (v === null) delete c[k]; else c[k] = v; }
    }
  },
  esquecer(colecao) {
    if (colecao) cache.delete(colecao); else cache.clear();
  },
};
