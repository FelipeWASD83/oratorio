// O plano dos 73 livros e a conversa com o plano da nova aba (numeração protestante).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarPlano, ETAPAS, TRILHAS_DIARIAS, LIVROS_DO_PLANO, salmoParaAveMaria, daNovaAba, paraNovaAba, juntarComNovaAba, versoParaAveMaria } from '../app/js/plano.js';

const { livros } = JSON.parse(readFileSync(new URL('../app/dados/livros.json', import.meta.url), 'utf8'));
const plano = criarPlano(livros);

test('73 livros, 1.334 capítulos', () => {
  assert.equal(livros.length, 73);
  assert.equal(livros.filter((l) => l[3] === 'AT').length, 46);
  assert.equal(livros.reduce((s, l) => s + l[4], 0), 1334);
});

test('o plano tem todos os livros, cada um uma vez', () => {
  const todos = [...LIVROS_DO_PLANO, ...TRILHAS_DIARIAS.flatMap((t) => t.livros)];
  assert.deepEqual(plano.foraDoPlano(), []);
  assert.equal(new Set(todos).size, todos.length);
  assert.equal(todos.length, 73);
  assert.ok(ETAPAS.every((e) => e.nome && e.porque && e.livros.length));
});

test('os livros católicos estão onde a história pede', () => {
  const ordem = LIVROS_DO_PLANO;
  assert.ok(ordem.indexOf('TOB') > ordem.indexOf('NEH') && ordem.indexOf('1MA') > ordem.indexOf('EST'));
  assert.ok(ETAPAS.find((e) => e.livros.includes('WIS')).livros.includes('SIR'));
  assert.ok(ETAPAS.find((e) => e.livros.includes('BAR')).livros.includes('JER'));
  assert.equal(ordem.indexOf('REV'), ordem.indexOf('DAN') + 1);
});

test('próximo é o primeiro não lido; leitura de hoje tem plano, salmo e provérbio', () => {
  const lidos = new Set(['GEN.1', 'GEN.3']);
  assert.deepEqual(plano.proximos(lidos, ['GEN'], 2), ['GEN.2', 'GEN.4']);
  const hoje = plano.leituraDeHoje(lidos, 2, null, '2026-10-17');
  assert.deepEqual(hoje.itens.map((i) => i.ref), ['GEN.2', 'GEN.4', 'PSA.1', 'PRO.1']);
  assert.equal(plano.leituraDeHoje(lidos, 2, hoje, '2026-10-17'), hoje);            // fixa no dia
  assert.equal(plano.maisUm(lidos, hoje).itens.at(-1).ref, 'GEN.5');
});

test('Salmos: numeração hebraica -> Ave-Maria', () => {
  assert.deepEqual(salmoParaAveMaria(23), [22]);
  assert.deepEqual(salmoParaAveMaria(51), [50]);
  assert.deepEqual(salmoParaAveMaria(9), [9]);
  assert.deepEqual(salmoParaAveMaria(10), [9]);
  assert.deepEqual(salmoParaAveMaria(116), [114, 115]);
  assert.deepEqual(salmoParaAveMaria(147), [146, 147]);
  assert.deepEqual(salmoParaAveMaria(150), [150]);
  const usados = new Set(Array.from({ length: 150 }, (_, i) => salmoParaAveMaria(i + 1)).flat());
  assert.equal(usados.size, 150);                    // cobre os 150 da Ave-Maria
});

test('Joel e Malaquias', () => {
  assert.deepEqual(daNovaAba('JOL', 2), [2, 3]);
  assert.deepEqual(daNovaAba('JOL', 3), [4]);
  assert.deepEqual(daNovaAba('MAL', 4), [3]);
  assert.deepEqual(daNovaAba('GEN', 7), [7]);
});

test('Ave-Maria -> nova aba: capítulo só conta inteiro, e os católicos ficam fora', () => {
  const lidos = new Set(['PSA.9', 'PSA.114', 'JOL.2', 'TOB.1', 'MAL.3']);
  const r = paraNovaAba(lidos, livros);
  assert.deepEqual(r.PSA, [9, 10]);                   // o 9 da Ave-Maria são o 9 e o 10
  assert.equal(r.PSA.includes(116), false);           // o 116 precisa do 114 E do 115
  assert.deepEqual(r.JOL, undefined);                 // o 2 protestante precisa do 2 e do 3
  assert.deepEqual(r.MAL, [3, 4]);
  assert.equal(r.TOB, undefined);
});

test('juntar com a nova aba: primeira vez soma os dois lados', () => {
  const r = juntarComNovaAba(new Set(['GEN.1', 'TOB.1']), { LUK: [1, 2], PSA: [23] }, null, livros);
  assert.deepEqual(r.marcar.sort(), ['LUK.1', 'LUK.2', 'PSA.22']);
  assert.deepEqual(r.desmarcar, []);
  assert.deepEqual(r.novaAba, { GEN: [1], PSA: [23], LUK: [1, 2] });
});

test('juntar com a nova aba: desmarcar lá desmarca aqui, e daqui vai para lá', () => {
  const visto = ['GEN.1', 'LUK.1', 'LUK.2'];
  const aqui = new Set(['GEN.1', 'LUK.1', 'LUK.2', 'ACT.1']);   // ACT.1 marcado aqui depois
  const r = juntarComNovaAba(aqui, { GEN: [1], LUK: [1] }, visto, livros);   // LUK.2 desmarcado lá
  assert.deepEqual(r.desmarcar, ['LUK.2']);
  assert.deepEqual(r.marcar, []);
  assert.deepEqual(r.novaAba, { GEN: [1], LUK: [1], ACT: [1] });
});

test('versículo do Vigia (numeração protestante) -> Ave-Maria', () => {
  const des = JSON.parse(readFileSync(new URL('../app/dados/versificacao.json', import.meta.url), 'utf8')).salmos;
  assert.equal(versoParaAveMaria('PSA.23.1-3', des), 'PSA.22.1-3');
  assert.equal(versoParaAveMaria('PSA.51.10', des), 'PSA.50.12');
  assert.equal(versoParaAveMaria('MAT.5.8', des), 'MAT.5.8');
  assert.equal(versoParaAveMaria('MAL.4.2', des), 'MAL.3.20');
});
