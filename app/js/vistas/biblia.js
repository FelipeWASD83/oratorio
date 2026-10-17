// vistas/biblia.js: o índice dos 73 livros, o leitor de capítulo e a busca.
//
// Rotas: #/biblia (índice), #/biblia/GEN/1 (capítulo), #/busca?q=... (busca).
// O capítulo marcado como lido e os destaques ficam na numeração da Ave-Maria; lendo
// outra tradução, o capítulo é convertido (Salmos, Joel e Malaquias contam diferente).

import { h, $, $$, escapar, semAcento, local, plural } from '../util.js';
import { api, dados } from '../api.js';
import { ctx, livro, nomeDoCapitulo, bibliaEscolhida, lidos, marcarLidos, refLegivel, toast } from '../contexto.js';
import { daNovaAba, salmoParaAveMaria } from '../plano.js';
import { reRender } from '../main.js';

export async function render(rota) {
  if (rota.nome === 'busca') return busca(rota.query.get('q') || '', rota.query.get('v') || bibliaEscolhida());
  const [cod, capTexto] = rota.args;
  if (!cod || !livro(cod)) return indice();
  return capitulo(cod, Number(capTexto) || 1, rota.query.get('v') || bibliaEscolhida(), Number(rota.query.get('vs')) || 0);
}

// ── índice ───────────────────────────────────────────────────

async function indice() {
  const conjunto = await lidos();
  const sigla = bibliaEscolhida();
  const grupo = (test) => ctx.livros.filter((l) => l[3] === test).map((l) => {
    const [cod, nome, abrev, , caps] = l;
    let feitos = 0;
    for (let c = 1; c <= caps; c++) if (conjunto.has(cod + '.' + c)) feitos++;
    return h('a', { class: 'livro-item', href: `#/biblia/${cod}/1` },
      h('span', { class: 'livro-item__abrev' }, abrev),
      h('span', { class: 'livro-item__nome' }, nome, ctx.deutero.has(cod) ? h('span', { class: 'livro-item__selo', title: 'Só a Bíblia católica tem este livro' }, 'católico') : null),
      h('span', { class: 'livro-item__barra' }, h('span', { style: `width:${(feitos / caps * 100).toFixed(1)}%` })));
  });
  return { titulo: 'Bíblia', secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'A Palavra'),
      h('h1', null, 'Bíblia'),
      h('p', { class: 'cabeca__sub' }, `${ctx.estado.biblias.find((b) => b.sigla === sigla)?.nome || 'Ave-Maria'} · 73 livros, ${plural(ctx.livros.reduce((s, l) => s + l[4], 0), 'capítulo', 'capítulos')}`),
      formBusca('', sigla))),
    h('section', null, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'Antigo Testamento · 46 livros'),
      h('div', { class: 'livros' }, grupo('AT')))),
    h('section', null, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, 'Novo Testamento · 27 livros'),
      h('div', { class: 'livros' }, grupo('NT')))),
    h('section', null, h('div', { class: 'miolo miolo--estreito leitura' },
      h('p', { class: 'rotulo' }, 'Sobre as traduções'),
      h('p', null, 'A Ave-Maria é a tradução católica completa (73 livros) e é a padrão. As outras que estão no seu PC (NTLH, ARA, ARC, NAA, NVI) têm só os 66 livros das Bíblias protestantes: abrindo Tobias, Judite, Sabedoria, Eclesiástico, Baruc ou os Macabeus nelas, o Oratório mostra a Ave-Maria.'),
      h('p', { class: 'texto-fraco' }, 'Nos Salmos, a Ave-Maria segue a numeração da Vulgata: o "Senhor é meu pastor" é o Salmo 22 (23 nas protestantes). O número entre parênteses é o das outras.'),
      h('p', { class: 'texto-fraco' }, 'O texto das traduções tem direito autoral e fica só neste aparelho e no seu servidor de casa.'))),
  ] };
}

function formBusca(q, sigla) {
  return h('form', { class: 'linha-campo', style: 'margin-top:1.4rem;max-width:40rem', onsubmit: (e) => {
    e.preventDefault();
    const texto = e.target.q.value.trim();
    if (texto) location.hash = `#/busca?q=${encodeURIComponent(texto)}&v=${sigla}`;
  } },
  h('input', { class: 'campo', name: 'q', value: q, placeholder: 'Buscar na Bíblia (ex.: amou o mundo)', 'aria-label': 'Buscar na Bíblia' }),
  h('button', { class: 'botao', type: 'submit' }, 'Buscar'));
}

// ── capítulo ─────────────────────────────────────────────────

/** Ave-Maria -> capítulo da tradução protestante (para trocar de tradução no meio). */
function capituloNaOutra(cod, cap) {
  if (cod === 'PSA') {
    for (let hb = 1; hb <= 150; hb++) if (salmoParaAveMaria(hb)[0] === cap || salmoParaAveMaria(hb).includes(cap)) return hb;
  }
  if (cod === 'JOL') return cap <= 2 ? cap : cap === 3 ? 2 : 3;
  return cap;
}

async function capitulo(cod, cap, sigla, versoAlvo) {
  const l = livro(cod);
  let usada = sigla;
  let aviso = '';
  if (sigla !== 'AM' && ctx.deutero.has(cod)) { usada = 'AM'; aviso = `A ${sigla} não tem ${l.nome} (só a Bíblia católica tem). Mostrando a Ave-Maria.`; }
  let r;
  try {
    r = await api.get(`/api/biblia/${usada}/${cod}/${cap}`);
  } catch (erro) {
    return { titulo: l.nome, secoes: [h('section', { class: 'cabeca' }, h('div', { class: 'miolo' }, h('p', { class: 'rotulo' }, 'Bíblia'), h('h1', null, nomeDoCapitulo(cod, cap, usada)), h('p', { class: 'cabeca__sub' }, erro.message === 'Capítulo não encontrado nesta tradução.' ? erro.message : 'A Bíblia ainda não foi baixada neste aparelho: rode ferramentas\\baixar_biblia.py.')))] };
  }
  const total = r.capitulos;
  // o que conta como "lido" é sempre o capítulo da Ave-Maria
  const refsAM = usada === 'AM' ? [`${cod}.${cap}`] : daNovaAba(cod, cap).map((c) => `${cod}.${c}`);
  const conjunto = await lidos();
  const lido = refsAM.every((x) => conjunto.has(x));
  const marcadores = await dados.listar('marcadores');
  const tamanho = local.ler('tamanho', 1);

  const versos = h('div', { class: 'escritura leitor', style: `font-size:${(1.32 * tamanho).toFixed(2)}rem` }, r.versos.map((t, i) => {
    if (!t) return null;
    const n = i + 1;
    const chave = `${usada}:${cod}.${cap}.${n}`;
    const m = marcadores[chave];
    return h('span', { class: 'verso' + (m ? ' verso--marcado' : ''), id: 'v' + n, dados: { n }, tabindex: '0', role: 'button', 'aria-label': `Versículo ${n}`, onclick: () => menuVerso(n, t, chave, m), onkeydown: (e) => { if (e.key === 'Enter') menuVerso(n, t, chave, m); } },
      h('span', { class: 'v' }, n), t, m && m.nota ? h('span', { class: 'verso__nota', title: m.nota }, '✎') : null, ' ');
  }));

  const anterior = cap > 1 ? `#/biblia/${cod}/${cap - 1}` : vizinho(cod, -1);
  const proximo = cap < total ? `#/biblia/${cod}/${cap + 1}` : vizinho(cod, 1);
  const seletorVersao = h('select', { class: 'campo', style: 'width:auto;min-height:2.2rem', 'aria-label': 'Tradução', onchange: (e) => {
    const nova = e.target.value;
    localStorage.setItem('oratorio:biblia', nova);
    let c = cap;
    if (usada === 'AM' && nova !== 'AM') c = capituloNaOutra(cod, cap);
    else if (usada !== 'AM' && nova === 'AM') c = daNovaAba(cod, cap)[0] || cap;
    location.hash = `#/biblia/${cod}/${c}?v=${nova}`;
  } }, ctx.estado.biblias.map((b) => h('option', { value: b.sigla, selected: b.sigla === usada }, b.sigla === 'AM' ? 'Ave-Maria' : b.sigla)));

  const notasDoCapitulo = Object.entries(marcadores).filter(([k]) => k.startsWith(`${usada}:${cod}.${cap}.`)).sort((a, b) => Number(a[0].split('.').pop()) - Number(b[0].split('.').pop()));

  const secoes = [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, h('a', { href: '#/biblia', style: 'color:inherit' }, 'Bíblia'), ' · ', l.testamento === 'AT' ? 'Antigo Testamento' : 'Novo Testamento', ctx.deutero.has(cod) ? ' · livro católico' : ''),
      h('h1', { style: 'margin-top:.6rem' }, nomeDoCapitulo(cod, cap, usada)),
      aviso ? h('p', { class: 'cabeca__sub' }, aviso) : null,
      h('div', { class: 'cabeca__acoes' },
        seletorVersao,
        h('button', { class: lido ? 'botao' : 'botao botao--linha', type: 'button', onclick: async () => { await marcarLidos(refsAM, !lido); toast(lido ? 'Desmarcado.' : 'Marcado como lido.'); reRender(); } }, lido ? '✓ Lido' : 'Marcar como lido'),
        anterior ? h('a', { class: 'botao botao--fantasma botao--pequeno', href: anterior + (usada !== 'AM' ? `?v=${usada}` : '') }, '← Anterior') : null,
        proximo ? h('a', { class: 'botao botao--fantasma botao--pequeno', href: proximo + (usada !== 'AM' ? `?v=${usada}` : '') }, 'Próximo →') : null))),
    h('section', null, h('div', { class: 'miolo leitor-miolo' },
      h('div', { class: 'leitor-ferramentas' },
        h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', 'aria-label': 'Letra menor', onclick: () => { local.gravar('tamanho', Math.max(0.8, tamanho - 0.1)); reRender(); } }, 'A−'),
        h('button', { class: 'botao botao--fantasma botao--pequeno', type: 'button', 'aria-label': 'Letra maior', onclick: () => { local.gravar('tamanho', Math.min(1.8, tamanho + 0.1)); reRender(); } }, 'A+'),
        h('span', { class: 'texto-fraco', style: 'font-size:.85rem' }, 'Toque num versículo para destacar, anotar ou copiar.')),
      versos,
      h('div', { class: 'leitor-pe' },
        anterior ? h('a', { class: 'botao botao--fantasma', href: anterior + (usada !== 'AM' ? `?v=${usada}` : '') }, '← Anterior') : h('span'),
        h('button', { class: lido ? 'botao' : 'botao botao--linha', type: 'button', onclick: async () => { await marcarLidos(refsAM, !lido); reRender(); } }, lido ? '✓ Lido' : 'Marcar como lido'),
        proximo ? h('a', { class: 'botao', href: proximo + (usada !== 'AM' ? `?v=${usada}` : ''), onclick: async () => { if (!lido) await marcarLidos(refsAM, true); } }, 'Lido, próximo →') : h('span')))),
    h('section', null, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, `${l.nome} · ${plural(total, 'capítulo', 'capítulos')}`),
      h('div', { class: 'capitulos' }, Array.from({ length: total }, (_, i) => {
        const c = i + 1;
        const refs = usada === 'AM' ? [`${cod}.${c}`] : daNovaAba(cod, c).map((x) => `${cod}.${x}`);
        const feito = refs.length && refs.every((x) => conjunto.has(x));
        return h('a', { class: 'capitulo' + (feito ? ' capitulo--lido' : '') + (c === cap ? ' capitulo--atual' : ''), href: `#/biblia/${cod}/${c}` + (usada !== 'AM' ? `?v=${usada}` : ''), 'aria-label': `Capítulo ${c}${feito ? ', lido' : ''}` }, c);
      })))),
    h('section', null, h('div', { class: 'miolo miolo--estreito' },
      h('p', { class: 'rotulo' }, 'Suas notas neste capítulo'),
      notasDoCapitulo.length
        ? h('ul', { class: 'lista-limpa divisor' }, notasDoCapitulo.map(([k, m]) => h('li', { style: 'padding:.7rem 0' },
          h('a', { href: `#v${k.split('.').pop()}`, onclick: (e) => { e.preventDefault(); document.getElementById('v' + k.split('.').pop())?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, refLegivel(k.split(':')[1])),
          m.nota ? h('p', { style: 'margin-top:.2rem' }, m.nota) : h('p', { class: 'texto-fraco' }, 'destacado'))))
        : h('p', { class: 'texto-fraco' }, 'Nenhuma ainda. Toque num versículo para destacar ou escrever uma nota.'))),
  ];
  return { titulo: nomeDoCapitulo(cod, cap, usada), secoes, depois: () => {
    if (versoAlvo) document.getElementById('v' + versoAlvo)?.scrollIntoView({ block: 'center' });
  } };
}

function vizinho(cod, passo) {
  const i = ctx.livros.findIndex((l) => l[0] === cod);
  const outro = ctx.livros[i + passo];
  if (!outro) return null;
  return passo > 0 ? `#/biblia/${outro[0]}/1` : `#/biblia/${outro[0]}/${outro[4]}`;
}

function menuVerso(n, texto, chave, marcado) {
  $$('.verso--ativo').forEach((v) => v.classList.remove('verso--ativo'));
  const alvo = document.getElementById('v' + n);
  alvo?.classList.add('verso--ativo');
  const nota = h('textarea', { class: 'campo', rows: 3, placeholder: 'Uma nota sua sobre este versículo (opcional)' }, marcado?.nota || '');
  const ref = refLegivel(chave.split(':')[1]);
  const dialogo = h('dialog', { class: 'dialogo' },
    h('p', { class: 'rotulo rotulo--lit' }, ref),
    h('p', { class: 'escritura', style: 'font-size:1.15rem;margin:.6rem 0 1rem' }, texto),
    nota,
    h('div', { class: 'dialogo__acoes' },
      h('button', { class: 'botao botao--fantasma', type: 'button', onclick: async () => {
        try { await navigator.clipboard.writeText(`${texto} (${ref})`); toast('Copiado.'); } catch { toast('Não deu para copiar.'); }
      } }, 'Copiar'),
      marcado ? h('button', { class: 'botao botao--fantasma', type: 'button', onclick: async () => { await dados.apagar('marcadores', chave); dialogo.close(); reRender(); } }, 'Tirar destaque') : null,
      h('button', { class: 'botao', type: 'button', onclick: async () => {
        await dados.gravar('marcadores', chave, { nota: nota.value.trim().slice(0, 2000), em: Date.now() });
        dialogo.close();
        reRender();
      } }, marcado ? 'Salvar' : 'Destacar')));
  dialogo.addEventListener('close', () => { alvo?.classList.remove('verso--ativo'); setTimeout(() => dialogo.remove(), 50); });
  document.body.append(dialogo);
  dialogo.showModal();
}

// ── busca ────────────────────────────────────────────────────

async function busca(q, sigla) {
  const r = q ? await api.get(`/api/biblia/${sigla}/busca?q=${encodeURIComponent(q)}`) : { resultados: [], total: 0 };
  const palavras = semAcento(q).match(/[a-z0-9]+/g) || [];
  const destacar = (t) => {
    let html = escapar(t);
    const base = semAcento(t);
    const faixas = [];
    for (const p of palavras) {
      let i = base.indexOf(p);
      while (i >= 0) { faixas.push([i, i + p.length]); i = base.indexOf(p, i + p.length); }
    }
    if (!faixas.length) return html;
    faixas.sort((a, b) => a[0] - b[0]);
    let saida = '', pos = 0;
    for (const [a, b] of faixas) { if (a < pos) continue; saida += escapar(t.slice(pos, a)) + '<mark>' + escapar(t.slice(a, b)) + '</mark>'; pos = b; }
    return saida + escapar(t.slice(pos));
  };
  return { titulo: 'Busca na Bíblia', secoes: [
    h('section', { class: 'cabeca' }, h('div', { class: 'miolo' },
      h('p', { class: 'rotulo' }, h('a', { href: '#/biblia', style: 'color:inherit' }, 'Bíblia'), ' · busca'),
      h('h1', null, q ? `"${q}"` : 'Buscar na Bíblia'),
      h('p', { class: 'cabeca__sub' }, q ? `${plural(r.total, 'versículo', 'versículos')} na ${sigla === 'AM' ? 'Ave-Maria' : sigla}${r.total > r.resultados.length ? ` (mostrando ${r.resultados.length})` : ''}` : ''),
      formBusca(q, sigla))),
    h('section', null, h('div', { class: 'miolo miolo--estreito' },
      r.resultados.length
        ? h('ul', { class: 'lista-limpa divisor resultados' }, r.resultados.map((x) => h('li', null,
          h('a', { href: `#/biblia/${x.livro}/${x.cap}?vs=${x.v}${sigla !== 'AM' ? `&v=${sigla}` : ''}` }, refLegivel(`${x.livro}.${x.cap}.${x.v}`)),
          h('p', { class: 'escritura', style: 'font-size:1.12rem', html: destacar(x.texto) }))))
        : h('p', { class: 'texto-fraco' }, q ? 'Nada encontrado. Tente menos palavras ou outra forma (a busca ignora acentos).' : 'Digite uma ou mais palavras.'))),
  ] };
}
