// vistas/embutidos.js: a Colinha de pecados e a Árvore da Bíblia, que são projetos próprios
// copiados para app/vendor/ (ferramentas/sincronizar_vendor.py) e abertos aqui dentro.
//
// A colinha guarda as marcações pelo servidor, atrás do cadeado (app/js/colinha-ponte.js);
// trancada, ela funciona sem mostrar nem salvar nada. A árvore abre do jeito dela.

import { h } from '../util.js';
import { ctx, trancado, pedirSenha } from '../contexto.js';
import { reRender } from '../main.js';

export async function render(rota) {
  return rota.nome === 'arvore' ? arvore() : colinha();
}

function colinha() {
  // A colinha usa a altura da tela (a capa tem 100vh): o quadro tem a altura da janela e rola por dentro.
  const quadro = h('iframe', { class: 'embutido embutido--tela', src: 'vendor/colinha/index.html', title: 'Colinha de pecados', loading: 'eager' });
  const fechado = trancado();
  return { titulo: 'Colinha de pecados', secoes: [
    h('section', { class: 'cabeca cabeca--curta' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'Caminho · exame de consciência'),
      h('h1', null, 'Colinha de pecados'),
      h('p', { class: 'cabeca__sub' }, fechado
        ? 'O cadeado está trancado: a colinha funciona, mas não mostra o que você salvou nem guarda o que marcar agora.'
        : ctx.estado.portao.tipo === 'nenhum' ? 'As marcações ficam guardadas neste aparelho e no servidor de casa.' : 'As marcações ficam atrás do cadeado e vão para o servidor de casa (o celular vê as mesmas).'),
      h('div', { class: 'cabeca__acoes' },
        fechado ? h('button', { class: 'botao', type: 'button', onclick: async () => { if (await pedirSenha()) reRender(); } }, 'Destravar para ver o que salvei') : null,
        h('a', { class: 'botao botao--linha', href: '#/guias/confissao' }, 'Como se confessar')))),
    h('section', { class: 'bloco--cheio' }, quadro),
  ] };
}

function arvore() {
  const quadro = h('iframe', { class: 'embutido embutido--tela', src: 'vendor/arvore/index.html', title: 'Árvore da Bíblia', loading: 'eager' });
  // A árvore começa e termina com faixa escura própria: aqui ela ocupa a tela inteira, sem cabeça nem rodapé.
  const s = h('section', { class: 'bloco--cheio' }, quadro);
  return { titulo: 'Árvore da Bíblia', secoes: [s], semRodape: true, depois: () => s.classList.remove('bloco--escuro') };
}
