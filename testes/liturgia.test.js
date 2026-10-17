// O calendário litúrgico: Páscoa, tempos, semanas, ciclos, cores e as transferências do Brasil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pascoa, partes, dataDe, diaLiturgico, datasDoAno, cicloDe, tempoDe, mesLiturgico } from '../app/js/liturgia.js';

const santos = JSON.parse(readFileSync(new URL('../app/dados/santos.json', import.meta.url), 'utf8')).itens;
const d = (n) => { const p = partes(n); return `${p.ano}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`; };
const dia = (a, m, x) => diaLiturgico(dataDe(a, m, x), santos);

test('Páscoa de anos conhecidos', () => {
  const certas = { 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16', 2030: '2030-04-21', 2038: '2038-04-25' };
  for (const [ano, data] of Object.entries(certas)) assert.equal(d(pascoa(Number(ano))), data, ano);
});

test('datas móveis de 2026 (Brasil)', () => {
  const D = datasDoAno(2026);
  assert.equal(d(D.cinzas), '2026-02-18');
  assert.equal(d(D.ascensao), '2026-05-17');          // no Brasil, domingo
  assert.equal(d(D.pentecostes), '2026-05-24');
  assert.equal(d(D.corpusChristi), '2026-06-04');     // no Brasil, quinta
  assert.equal(d(D.cristoRei), '2026-11-22');
  assert.equal(d(D.advento), '2026-11-29');
  assert.equal(d(D.epifania), '2026-01-04');          // domingo entre 2 e 8
  assert.equal(d(D.batismo), '2026-01-11');
});

test('Batismo na segunda-feira quando a Epifania cai em 7 ou 8 de janeiro', () => {
  const D = datasDoAno(2024);                          // 7/1/2024 foi domingo
  assert.equal(d(D.epifania), '2024-01-07');
  assert.equal(d(D.batismo), '2024-01-08');
});

test('ano A/B/C e ciclo I/II', () => {
  assert.deepEqual(cicloDe(dataDe(2026, 10, 17)), { domingos: 'A', semana: 'II' });
  assert.deepEqual(cicloDe(dataDe(2026, 12, 8)), { domingos: 'B', semana: 'I' });
  assert.deepEqual(cicloDe(dataDe(2025, 6, 1)), { domingos: 'C', semana: 'I' });
});

test('semanas do Tempo Comum', () => {
  assert.equal(dia(2026, 10, 18).nome, '29º Domingo do Tempo Comum');
  assert.equal(dia(2026, 10, 17).semanaTempo, 28);
  assert.equal(dia(2026, 1, 12).nome, 'Segunda-feira da 1ª Semana do Tempo Comum');
  assert.equal(dia(2026, 1, 18).nome, '2º Domingo do Tempo Comum');
  assert.equal(tempoDe(dataDe(2024, 1, 9)).semana, 1);      // Batismo na segunda: a 1ª semana começa na terça
  assert.equal(tempoDe(dataDe(2024, 1, 15)).semana, 2);
});

test('hoje (17/10/2026): Santo Inácio de Antioquia, vermelho', () => {
  const x = dia(2026, 10, 17);
  assert.match(x.nome, /Inácio de Antioquia/);
  assert.equal(x.cor, 'vermelho');
});

test('transferências do Brasil para o domingo', () => {
  assert.match(dia(2026, 6, 28).nome, /Pedro e São Paulo/);
  assert.match(dia(2026, 8, 16).nome, /Assunção/);
  assert.match(dia(2026, 11, 1).nome, /Todos os Santos/);
  assert.match(dia(2026, 11, 2).nome, /Fiéis Defuntos/);
  assert.equal(dia(2026, 11, 2).cor, 'roxo');
  assert.match(dia(2025, 11, 2).nome, /Todos os Santos/);  // 2/11/2025 foi domingo
  assert.match(dia(2025, 11, 3).nome, /Fiéis Defuntos/);
});

test('domingo do Tempo Comum vence festa de santo; solenidade vence o domingo', () => {
  assert.equal(dia(2026, 10, 18).cor, 'verde');                    // São Lucas cai no domingo e cede
  assert.match(dia(2026, 11, 1).nome, /Todos os Santos/);
});

test('solenidade no domingo do Advento vai para a segunda', () => {
  const x = dia(2019, 12, 9);                                     // 8/12/2019 foi o 2º domingo do Advento
  assert.match(x.nome, /Imaculada Conceição/);
  assert.equal(dia(2019, 12, 8).nome, '2º Domingo do Advento');
});

test('São José na Semana Santa vai para o sábado antes de Ramos', () => {
  // 2035: Páscoa 25/3, Ramos 18/3, São José (19/3) cai na segunda santa
  assert.match(dia(2035, 3, 17).nome, /São José/);
});

test('cores: Gaudete, Laetare, Ramos, Sexta-feira Santa, Pentecostes, Natal', () => {
  assert.equal(dia(2026, 12, 13).cor, 'rosa');
  assert.equal(dia(2026, 3, 15).cor, 'rosa');
  assert.equal(dia(2026, 3, 29).cor, 'vermelho');
  assert.equal(dia(2026, 4, 3).cor, 'vermelho');
  assert.equal(dia(2026, 5, 24).cor, 'vermelho');
  assert.equal(dia(2026, 12, 25).cor, 'branco');
  assert.equal(dia(2026, 2, 18).cor, 'roxo');
});

test('jejum, abstinência e preceito', () => {
  assert.ok(dia(2026, 2, 18).jejum && dia(2026, 2, 18).abstinencia);
  assert.ok(dia(2026, 4, 3).jejum);
  assert.ok(dia(2026, 10, 16).abstinencia && !dia(2026, 10, 16).jejum);     // sexta comum
  assert.ok(!dia(2026, 12, 25).abstinencia || dia(2026, 12, 25).diaSemana !== 'sexta-feira');
  assert.ok(dia(2026, 12, 8).preceito && dia(2026, 1, 1).preceito && dia(2026, 6, 4).preceito && dia(2026, 12, 25).preceito);
  assert.ok(dia(2026, 10, 18).preceito);
  assert.ok(!dia(2026, 10, 12).preceito);   // Aparecida: feriado, não preceito
});

test('memória na Quaresma vira comemoração', () => {
  // 7/3/2026 (sábado da 2ª semana): Santas Perpétua e Felicidade
  const x = dia(2026, 3, 7);
  assert.equal(x.cor, 'roxo');
  assert.ok(x.outras.some((o) => o.comemoracao));
});

test('o mês do calendário tem 42 dias e começa no domingo', () => {
  const m = mesLiturgico(2026, 10, santos);
  assert.equal(m.length, 42);
  assert.equal(m[0].diaSemana, 'domingo');
  assert.equal(m.filter((x) => x.doMes).length, 31);
});

test('todo dia de 2026 a 2028 tem nome e cor conhecida', () => {
  for (let n = dataDe(2026, 1, 1); n <= dataDe(2028, 12, 31); n++) {
    const x = diaLiturgico(n, santos);
    assert.ok(x.nome && ['verde', 'roxo', 'branco', 'vermelho', 'rosa'].includes(x.cor), d(n));
  }
});
