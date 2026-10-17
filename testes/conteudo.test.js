// O conteúdo escrito à mão: todo § citado nos guias existe e diz o que a palavra-chave promete
// (conferido no texto do Catecismo baixado), toda referência da Bíblia existe na Ave-Maria,
// e nada tem travessão. As partes que leem o cache pulam se ele não estiver no PC.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { GUIAS, CONFERIDOS } from '../app/js/conteudo/guias.js';
import { ORACOES, MISTERIOS, contasDoTerco, contasDaMisericordia } from '../app/js/conteudo/oracoes.js';
import { MODELOS } from '../app/js/conteudo/modelos.js';
import { DO_DIA } from '../app/vendor/vigia/versiculos.js';
import { versoParaAveMaria } from '../app/js/plano.js';
import { sugerir } from '../app/js/sugestoes.js';

const cic = existsSync(new URL('../cache/catecismo.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('../cache/catecismo.json', import.meta.url), 'utf8')).paragrafos : null;
const am = existsSync(new URL('../cache/biblias/AM.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('../cache/biblias/AM.json', import.meta.url), 'utf8')).livros : null;
const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const textoDosGuias = JSON.stringify(GUIAS);
const citados = [...new Set([...textoDosGuias.matchAll(/\{cic:(\d+)\}/g)].map((m) => Number(m[1])))];
const biblicos = [...new Set([...textoDosGuias.matchAll(/\{bib:([^}]+)\}/g)].map((m) => m[1]))];

test('todo § citado nos guias tem palavra conferida', () => {
  const faltam = citados.filter((n) => !CONFERIDOS[n]);
  assert.deepEqual(faltam, []);
});

test('o texto de cada § citado tem a palavra conferida', { skip: !cic && 'sem o Catecismo no cache' }, () => {
  for (const [n, palavra] of Object.entries(CONFERIDOS)) {
    assert.ok(cic[n], `§ ${n} não existe`);
    assert.ok(semAcento(cic[n].t).includes(semAcento(palavra)), `§ ${n} não fala de "${palavra}"`);
  }
});

function existe(ref) {
  const m = /^([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) return false;
  const cap = am[m[1]]?.[Number(m[2]) - 1];
  return !!cap && !!cap[Number(m[3]) - 1] && (!m[4] || !!cap[Number(m[4]) - 1]);
}

test('toda referência da Bíblia (guias, terço, orações) existe na Ave-Maria', { skip: !am && 'sem a Bíblia no cache' }, () => {
  const refs = [...biblicos, ...Object.values(MISTERIOS).flatMap((m) => m.itens.map((i) => i.biblia)), ...ORACOES.filter((o) => o.biblia).map((o) => o.biblia)];
  assert.deepEqual(refs.filter((r) => !existe(r)), []);
});

test('os 163 versículos do dia do Vigia acham texto na Ave-Maria', { skip: !am && 'sem a Bíblia no cache' }, () => {
  const des = JSON.parse(readFileSync(new URL('../app/dados/versificacao.json', import.meta.url), 'utf8')).salmos;
  assert.ok(DO_DIA.length > 100);
  assert.deepEqual(DO_DIA.map((r) => versoParaAveMaria(r, des)).filter((r) => !existe(r)), []);
});

test('o terço tem 78 contas (5 dezenas) e a misericórdia 58', () => {
  for (const k of Object.keys(MISTERIOS)) {
    const c = contasDoTerco(k);
    assert.equal(c.length, 78, k);
    assert.equal(c.filter((x) => x.tipo === 'ave' && x.misterio !== undefined).length, 50);
  }
  assert.equal(contasDaMisericordia().length, 4 + 5 * 11 + 3);
  const dias = Object.values(MISTERIOS).flatMap((m) => m.dias).sort();
  assert.deepEqual(dias, [0, 1, 2, 3, 4, 5, 6]);
});

test('toda oração tem texto ou vem da Bíblia, e os ids não repetem', () => {
  assert.ok(ORACOES.every((o) => o.texto || o.daBiblia));
  assert.equal(new Set(ORACOES.map((o) => o.id)).size, ORACOES.length);
  for (const c of Object.keys(MISTERIOS).flatMap((k) => contasDoTerco(k))) if (c.oracao) assert.ok(ORACOES.some((o) => o.id === c.oracao), c.oracao);
});

test('nada que ele lê tem travessão', () => {
  const pastas = ['../app/js/', '../app/js/vistas/', '../app/js/conteudo/', '../servidor/'];
  for (const p of pastas) {
    for (const nome of readdirSync(new URL(p, import.meta.url))) {
      if (!/\.(js|py|html)$/.test(nome) || nome === 'provedor.py') continue;
      const texto = readFileSync(new URL(p + nome, import.meta.url), 'utf8');
      assert.equal(texto.includes('—'), false, `${p}${nome} tem travessão`);
    }
  }
  assert.equal((JSON.stringify(MODELOS) + JSON.stringify(ORACOES) + textoDosGuias).includes('—'), false);
});

test('dicas da oração', () => {
  assert.equal(sugerir('Senhor').length, 1);
  const sem = sugerir('Hoje eu quero falar com você sobre a minha vida e o meu trabalho que anda difícil demais');
  assert.ok(sem.some((s) => s.id === 'chamar'));
  assert.ok(sem.some((s) => s.id === 'amem'));
  const completa = sugerir('Senhor, eu te louvo pela tua bondade. Perdão pelos meus pecados de hoje. Obrigado pela minha família e pelo trabalho. Te peço que cuides da minha mãe e abençoes meu irmão. Amém');
  assert.ok(completa.some((s) => s.id === 'completa'));
  assert.ok(!completa.some((s) => s.id === 'amem' || s.id === 'chamar'));
  assert.ok(sugerir('Nossa Senhora, me salva deste problema e me ajuda a passar na prova amanhã por favor. Amém').some((s) => s.id === 'intercessao'));
  assert.ok(sugerir('Senhor, te peço ajuda. Vos agradeço por tudo o que fizestes na minha vida até aqui. Amém').some((s) => s.id === 'tratamento'));
  assert.ok(sugerir('Senhor, esta oração é infalível, reze sete vezes e repasse para dez pessoas. Amém').some((s) => s.id === 'supersticao'));
});
