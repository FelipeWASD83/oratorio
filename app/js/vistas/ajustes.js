// vistas/ajustes.js: Bíblia padrão, IA, cadeado, sincronia, nova aba, atualização e as fontes.

import { h, plural, dataHora } from '../util.js';
import { api } from '../api.js';
import { ctx, recarregarEstado, pedirSenha, toast, quandoFoi, sincronizarNovaAba } from '../contexto.js';
import * as ponte from '../ponte.js';
import { reRender, redesenharCasca } from '../main.js';

const MODELOS = [
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (padrão: bom e barato)'],
  ['claude-opus-5-5', 'Claude Opus 5.5 (o mais caprichado)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (rápido e baratíssimo)'],
  ['gpt-6-luna', 'GPT-6 luna'],
  ['gpt-6.1-sol', 'GPT-6.1 sol'],
  ['gpt-6-astra', 'GPT-6 astra'],
];
const RESERVAS = [['gpt-6-luna', 'GPT-6 luna (padrão)'], ['claude-haiku-5-5', 'Claude Haiku 5.5'], ['auto', 'Automática (o par do outro lado)'], ['nenhuma', 'Nenhuma']];
const ESFORCOS = [['low', 'Pouco'], ['medium', 'Médio (padrão)'], ['high', 'Muito']];

export async function render() {
  const e = await recarregarEstado();
  const ia = e.ia;
  const extensao = await ponte.extensao();
  let atualizacao = null;
  if (e.modo !== 'servidor') atualizacao = await api.get('/api/atualizacao').catch((erro) => ({ erro: erro.message }));

  const select = (opcoes, atual, aoMudar, rotulo) => h('select', { class: 'campo', 'aria-label': rotulo, onchange: (ev) => aoMudar(ev.target.value) },
    [...(opcoes.some(([v]) => v === atual) ? [] : [[atual, atual]]), ...opcoes].map(([v, t]) => h('option', { value: v, selected: v === atual }, t)));
  const mudarIa = async (campo, valor) => { await api.put('/api/ia', { [campo]: valor }); toast('Guardado.'); reRender(); };

  const cabeca = h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
    h('p', { class: 'rotulo' }, 'Ajustes'),
    h('h1', null, 'Ajustes'),
    h('p', { class: 'cabeca__sub' }, `Oratório ${e.versao} · ${e.modo === 'servidor' ? 'servidor de casa' : e.modo === 'demo' ? 'demonstração (dados temporários, IA de mentira)' : 'este PC'}`)));

  const principal = h('section', null, h('div', { class: 'miolo' }, h('div', { class: 'grade grade--larga' },
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Bíblia'),
      h('label', { class: 'rotulo' }, 'Tradução padrão do leitor'),
      select(e.biblias.map((b) => [b.sigla, b.sigla === 'AM' ? 'Ave-Maria (73 livros)' : `${b.nome} (66 livros)`]), localStorage.getItem('oratorio:biblia') || 'AM', (v) => { localStorage.setItem('oratorio:biblia', v); toast('Guardado neste aparelho.'); }, 'Tradução'),
      e.biblias.length ? h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, plural(e.biblias.length, 'tradução neste aparelho', 'traduções neste aparelho'), '. A Ave-Maria é a católica completa; as outras vêm do cache do arvore-biblica.')
        : h('p', { class: 'aviso' }, 'Nenhuma Bíblia baixada. No PC: python ferramentas\\baixar_biblia.py'),
      h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, e.catecismo ? 'Catecismo baixado.' : 'Catecismo não baixado: python ferramentas\\baixar_catecismo.py')),
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'IA (perguntas e revisor de orações)'),
      ia.falsa ? h('p', { class: 'aviso' }, 'IA de demonstração: as respostas são de mentira e nada sai do PC.') : null,
      h('label', { class: 'rotulo' }, 'Modelo'), select(MODELOS, ia.modelo, (v) => mudarIa('modelo', v), 'Modelo'),
      h('label', { class: 'rotulo' }, 'Reserva quando o crédito acabar'), select(RESERVAS, ia.reserva, (v) => mudarIa('reserva', v), 'Reserva'),
      h('label', { class: 'rotulo' }, 'Quanto pensar'), select(ESFORCOS, ia.esforco, (v) => mudarIa('esforco', v), 'Esforço'),
      h('p', { class: 'texto-fraco', style: 'font-size:.88rem' },
        `Chaves: OpenAI ${ia.tem_openai ? 'ok' : 'falta'}, Anthropic ${ia.tem_claude ? 'ok' : 'falta'} (arquivo .env na pasta do Oratório: OPENAI_API_KEY e ANTHROPIC_API_KEY). `,
        `Gasto hoje: US$ ${ia.gasto_hoje.toFixed(4)} de US$ ${ia.teto_dia.toFixed(2)} (ORATORIO_TETO_DIA no .env).`)),
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Cadeado'),
      e.portao.tipo === 'nenhum' ? h('p', null, 'Sem cadeado neste aparelho: nada fica trancado.')
        : h('p', null, e.portao.tipo === 'cadeado' ? 'Usa a senha do cadeado do PC (tranca sozinho com 15 min parado).' : 'Usa a mesma senha do cadeado, com um acesso que dura 400 dias neste navegador.'),
      e.portao.tipo !== 'nenhum' ? h('p', null, 'Agora: ', h('b', null, e.portao.aberto ? 'aberto' : 'trancado')) : null,
      h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, 'Ficam atrás dele: os dias limpo do Vigia, o que você salvou na colinha e o histórico de perguntas à IA.'),
      e.portao.tipo !== 'nenhum' ? h('div', { class: 'cartao__pe' }, e.portao.aberto
        ? h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', onclick: async () => { await api.post('/api/portao/trancar'); await recarregarEstado(); redesenharCasca(); reRender(); } }, 'Trancar agora')
        : h('button', { class: 'botao botao--pequeno', type: 'button', onclick: async () => { if (await pedirSenha()) { redesenharCasca(); reRender(); } } }, 'Destravar')) : null))));

  const s = e.sincronia;
  const conexoes = h('section', null, h('div', { class: 'miolo' }, h('div', { class: 'grade grade--larga' },
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Servidor de casa (celular)'),
      e.modo === 'servidor' ? h('p', null, 'Este é o servidor de casa: o PC manda e recebe os dados daqui, e o celular abre este endereço.')
        : s.ligada ? [
          h('p', null, `Sincroniza com ${s.url}. Última vez: ${s.quando ? dataHora(s.quando) : 'ainda não'}${s.ok === false ? ` (erro: ${s.erro})` : ''}.`),
          h('div', { class: 'cartao__pe' }, h('button', { class: 'botao botao--pequeno', type: 'button', onclick: async () => { try { const r = await api.post('/api/sincronia/agora'); toast(r.ok ? `Sincronizado: ${r.enviados} enviados, ${r.recebidos} recebidos.` : `Falhou: ${r.erro}`); } catch (erro) { toast(erro.message); } reRender(); } }, 'Sincronizar agora'))]
          : h('p', { class: 'texto-fraco' }, 'Desligada. Para usar no celular, o Oratório roda no servidor de casa (implantar\\enviar.ps1) e este PC sincroniza com ele (ORATORIO_SINCRONIA_URL e ORATORIO_SINCRONIA_TOKEN no .env; o configurar-sincronia.ps1 escreve os dois).')),
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Nova aba do Brave'),
      extensao ? [
        h('p', null, `Extensão ${extensao} encontrada: os dias limpo vêm do Vigia e o plano é o mesmo do balão Bíblia.`),
        h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, `Última junção do plano: ${quandoFoi(ctx.sincroniaNovaAba.quando)}.`),
        h('div', { class: 'cartao__pe' }, h('button', { class: 'botao botao--pequeno', type: 'button', onclick: async () => { const r = await sincronizarNovaAba(); toast(r.ok ? 'Plano juntado.' : r.motivo); reRender(); } }, 'Juntar o plano agora'))]
        : h('p', { class: 'texto-fraco' }, 'Não encontrada neste navegador. Ela precisa ser a 1.4.0 ou mais nova, no Brave, com o Oratório aberto em localhost:8074 (ou no servidor de casa, 192.168.1.214:8076). No celular ela não existe, e está tudo bem.')),
    h('div', { class: 'cartao' },
      h('p', { class: 'rotulo rotulo--lit' }, 'Atualização'),
      e.modo === 'servidor' ? h('p', { class: 'texto-fraco' }, 'O servidor de casa se atualiza pelo PC: implantar\\enviar.ps1.')
        : !atualizacao || atualizacao.erro ? h('p', { class: 'texto-fraco' }, `Versão ${e.versao}. ${atualizacao && atualizacao.erro ? atualizacao.erro : ''}`)
          : [
            h('p', null, `Versão ${atualizacao.atual}. ${atualizacao.ultima ? `A mais nova no GitHub: ${atualizacao.ultima}.` : ''}`),
            atualizacao.dev ? h('p', { class: 'texto-fraco', style: 'font-size:.88rem' }, 'Esta é a pasta do projeto (tem .git): atualize com git pull.') : null,
            atualizacao.nova && !atualizacao.dev ? h('div', { class: 'cartao__pe' }, h('button', { class: 'botao botao--pequeno', type: 'button', onclick: async (ev) => {
              ev.target.disabled = true;
              try { const r = await api.post('/api/atualizacao/aplicar'); toast(r.reiniciando ? `Baixada a ${r.versao}. Reiniciando...` : `Baixada a ${r.versao}: feche e abra o Oratório.`); if (r.reiniciando) setTimeout(() => location.reload(), 4000); } catch (erro) { toast(erro.message); ev.target.disabled = false; }
            } }, `Atualizar para ${atualizacao.ultima}`)) : null,
            h('div', { class: 'cartao__pe' }, h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', onclick: async () => { await api.get('/api/atualizacao?forcar=1'); reRender(); } }, 'Procurar de novo'))]))));

  const fontes = h('section', null, h('div', { class: 'miolo miolo--estreito leitura' },
    h('p', { class: 'rotulo' }, 'Fontes e licenças'),
    h('ul', null,
      h('li', null, 'Bíblia Ave-Maria: texto do repositório fidalgobr/bibliaAveMariaJSON. Direito autoral dos editores; uso pessoal, nunca publicado.'),
      h('li', null, 'NTLH, ARA, ARC, NAA e NVI: do cache do projeto arvore-biblica (repositório damarals/biblias). Mesma regra.'),
      h('li', null, 'Catecismo da Igreja Católica: texto em português do vatican.va (Libreria Editrice Vaticana). Uso pessoal.'),
      h('li', null, 'Santos e festas: romcal (licença MIT). O resto do calendário é calculado aqui.'),
      h('li', null, 'Respostas da Missa: tradução brasileira da 3ª edição do Missal Romano (CNBB), conferidas no material de divulgação da CNBB.'),
      h('li', null, 'Orações: textos tradicionais de domínio público. Modelos de oração e guias: escritos para este app.'),
      h('li', null, 'Colinha de pecados e Árvore da Bíblia: projetos do Felipe, copiados para dentro do app. A árvore usa o TIPNR (STEPBible, CC BY 4.0).'),
      h('li', null, 'Fontes: EB Garamond e Source Sans 3 (SIL Open Font License).')),
    h('p', { class: 'texto-fraco' }, 'Nenhum texto com direito autoral entra no código do Oratório nem nas versões publicadas: a Bíblia e o Catecismo são baixados por scripts para a pasta cache, neste aparelho.')));

  return { titulo: 'Ajustes', secoes: [cabeca, principal, conexoes, fontes] };
}
