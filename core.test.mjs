import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SCHEDULE,
  DEFAULT_PROGRAMS,
  MAX_VISITORS,
  VISIT_DURATION_MINUTES,
  addMinutes,
  buildVisitTimeline,
  directionsUrl,
  estimateVisitCosts,
  formatCsv,
  studentSplit,
  validateSchedule,
} from "./core.mjs";

test("divide até quarenta alunos em dois grupos equilibrados", () => {
  assert.deepEqual(studentSplit(40), [20, 20]);
  assert.deepEqual(studentSplit(39), [20, 19]);
  assert.deepEqual(studentSplit(1), [1, 0]);
});

test("rejeita grupos vazios, fracionários e acima da capacidade", () => {
  for (const value of [0, -1, 1.5, MAX_VISITORS + 1, Number.NaN]) {
    assert.throws(() => studentSplit(value), RangeError);
  }
});

test("confirma que a agenda padrão dura exatamente quatro horas", () => {
  assert.equal(validateSchedule(DEFAULT_SCHEDULE), true);
  assert.equal(DEFAULT_SCHEDULE.reduce((sum, block) => sum + block.minutes, 0), VISIT_DURATION_MINUTES);
});

test("mantém quatro agendas pedagógicas editáveis de exatamente quatro horas", () => {
  assert.equal(DEFAULT_PROGRAMS.length, 4);
  for (const program of DEFAULT_PROGRAMS) {
    assert.equal(validateSchedule(program.schedule), true, program.name);
    assert.equal(program.schedule.reduce((sum, block) => sum + block.minutes, 0), VISIT_DURATION_MINUTES);
  }
  const longTrail = DEFAULT_PROGRAMS.find((program) => program.id === "fundamental-ii-viver");
  assert.equal(longTrail.schedule.find((block) => block.id === "fund2-trilha").minutes, 40);
});

test("impede publicar uma agenda com duração diferente de quatro horas", () => {
  assert.throws(() => validateSchedule(DEFAULT_SCHEDULE.slice(1)), /exatamente 4 horas/);
  assert.throws(() => validateSchedule([{ label: "Sem duração", minutes: 0 }]), /entre 1 e 240/);
  assert.throws(() => validateSchedule([{ label: "", minutes: 240 }]), /nome de todas/);
});

test("gera horários em dois ciclos, rotações espelhadas e deslocamento para o grupo", () => {
  const timeline = buildVisitTimeline({
    students: 40,
    startTime: "08:00",
  });

  assert.equal(timeline[0].startsAt, "08:00");
  assert.equal(timeline.at(-1).endsAt, "12:00");
  assert.equal(timeline[1].groupA, "Case Viver");
  assert.equal(timeline[1].groupB, "Case Ilha Verde");
  assert.equal(timeline[1].groupASize, 20);
  assert.equal(timeline[1].groupBSize, 20);
  assert.equal(timeline[4].groupA, "Case Ilha Verde");
  assert.equal(timeline[4].groupB, "Case Viver");
  assert.equal(timeline[3].label, "Transição e deslocamento");
});

test("aceita agendas com nomes e tempos ajustados desde que somem quatro horas", () => {
  const blocks = DEFAULT_SCHEDULE.map((block, index) => ({
    ...block,
    label: index === 3 ? "Deslocamento confirmado" : block.label,
  }));
  assert.equal(validateSchedule(blocks), true);
  const timeline = buildVisitTimeline({ students: 39, startTime: "13:30" }, blocks);
  assert.equal(timeline.at(-1).endsAt, "17:30");
  assert.equal(timeline[1].groupASize, 20);
  assert.equal(timeline[1].groupBSize, 19);
});

test("gera a agenda do roteiro escolhido para uma turma sem divisão fictícia", () => {
  const program = DEFAULT_PROGRAMS.find((entry) => entry.id === "medio-ilha-verde");
  const timeline = buildVisitTimeline({
    students: 32,
    startTime: "08:30",
    site: program.site,
    mode: "program",
  }, program.schedule, program);

  assert.equal(timeline[0].startsAt, "08:30");
  assert.equal(timeline.at(-1).endsAt, "12:30");
  assert.equal(timeline[0].location, "Case Ilha Verde");
  assert.equal(timeline[0].groupA, "Case Ilha Verde");
  assert.equal(timeline[0].groupASize, 32);
  assert.equal(timeline[0].groupBSize, 0);
});

test("gera endereços válidos de rota no Google Maps", () => {
  const route = new URL(directionsUrl("Escola A, Viamão", "Case Viver"));
  assert.equal(route.hostname, "www.google.com");
  assert.equal(route.searchParams.get("origin"), "Escola A, Viamão");
  assert.equal(route.searchParams.get("destination"), "Case Viver");
  assert.throws(() => directionsUrl("", "Case Viver"), /origem e o destino/);
});

test("estima insumos para visitas futuras e ignora visitas canceladas e passadas", () => {
  const result = estimateVisitCosts([
    { date: "2030-01-15", status: "confirmada", students: 20 },
    { date: "2030-01-16", status: "planejada", students: 40 },
    { date: "2030-01-17", status: "cancelada", students: 10 },
    { date: "2020-01-17", status: "concluída", students: 30 },
  ], [
    { name: "Suco", perStudent: 1, unitCost: 2.5 },
    { name: "Copo", perStudent: 2, unitCost: 0 },
  ], "2030-01-01");

  assert.equal(result.children, 60);
  assert.equal(result.visits, 2);
  assert.equal(result.lines[0].quantity, 60);
  assert.equal(result.lines[0].subtotal, 150);
  assert.equal(result.lines[1].quantity, 120);
  assert.equal(result.total, 150);
  assert.equal(result.filledLines, 1);
});

test("calcula itens do cardápio somente para as unidades correspondentes", () => {
  const result = estimateVisitCosts([
    { date: "2030-01-15", status: "confirmada", students: 10, site: "Case Viver" },
    { date: "2030-01-16", status: "planejada", students: 30, site: "Case Agro" },
  ], [
    { name: "Lanche", site: "Case Viver", perStudent: 1, unitCost: 2 },
    { name: "Suco", site: "Case Agro", perStudent: 2, unitCost: 1.5 },
    { name: "Copo", site: "Complexo (geral)", perStudent: 1, unitCost: 0.1 },
  ], "2030-01-01");

  assert.equal(result.children, 40);
  assert.equal(result.lines[0].quantity, 10);
  assert.equal(result.lines[0].subtotal, 20);
  assert.equal(result.lines[1].quantity, 60);
  assert.equal(result.lines[1].subtotal, 90);
  assert.equal(result.lines[2].quantity, 40);
  assert.equal(result.total, 114);
});

test("formata CSV escapando aspas e mantendo colunas separadas", () => {
  assert.equal(formatCsv([["Escola", "Detalhe"], ["Colégio \"Verde\"", "uma;coluna"]]), '"Escola";"Detalhe"\r\n"Colégio ""Verde""";"uma;coluna"');
});
