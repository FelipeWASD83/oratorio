// ponte.js: a conversa com a extensão da nova aba (o Vigia e o plano da Bíblia), quando ela existe.
//
// Só funciona no Brave do Felipe com a extensão carregada (versão 1.4.0 em diante), na página
// do PC (localhost:8074) ou do servidor de casa aberta no PC. No celular ela não existe e tudo
// passa pelo servidor: a recaída fica pendente e o PC entrega ao Vigia na próxima vez.

let pronta = null;          // Promise<versão | null>
let contador = 0;
const esperando = new Map();

window.addEventListener('message', (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.oratorio === 'resposta' && esperando.has(d.id)) {
    const { resolver, timer } = esperando.get(d.id);
    clearTimeout(timer);
    esperando.delete(d.id);
    resolver(d);
  }
});

/** A versão da extensão, ou null se ela não está aqui. */
export function extensao() {
  if (!pronta) {
    pronta = new Promise((resolver) => {
      const ouvir = (e) => {
        if (e.source === window && e.data && e.data.oratorio === 'pronto') {
          window.removeEventListener('message', ouvir);
          resolver(String(e.data.versao || '?'));
        }
      };
      window.addEventListener('message', ouvir);
      window.postMessage({ oratorio: 'ping' }, location.origin);
      setTimeout(() => { window.removeEventListener('message', ouvir); resolver(null); }, 900);
    });
  }
  return pronta;
}

async function pedir(tipo, dados = {}) {
  if (!(await extensao())) throw new Error('A extensão da nova aba não está neste navegador.');
  const id = 'p' + (++contador) + '-' + Date.now();
  const r = await new Promise((resolver) => {
    const timer = setTimeout(() => { esperando.delete(id); resolver({ ok: false, erro: 'A extensão não respondeu.' }); }, 5000);
    esperando.set(id, { resolver, timer });
    window.postMessage({ oratorio: 'pedido', id, tipo, dados }, location.origin);
  });
  if (!r.ok) throw new Error(r.erro || 'A extensão recusou.');
  return r.dados;
}

export const vigia = {
  ler: () => pedir('vigia-ler'),
  recair: (em) => pedir('vigia-recair', { em }),
  vontadeVencida: (em) => pedir('vigia-vontade', { em }),
};

export const bibliaNovaAba = {
  ler: () => pedir('biblia-ler'),
  gravar: (lidos) => pedir('biblia-gravar', { lidos }),
};
