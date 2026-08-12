import assert from "node:assert/strict";
import test from "node:test";

import { timePeriodForHour } from "../app/nimvi/timeOfDay.ts";

test("a janela divide o relógio local em quatro períodos", () => {
  for (const hour of [0, 1, 5]) assert.equal(timePeriodForHour(hour), "dawn");
  for (const hour of [6, 8, 11]) assert.equal(timePeriodForHour(hour), "day");
  for (const hour of [12, 15, 17]) assert.equal(timePeriodForHour(hour), "afternoon");
  for (const hour of [18, 21, 23]) assert.equal(timePeriodForHour(hour), "night");
});

test("horas fora do intervalo são normalizadas em um ciclo de 24 horas", () => {
  assert.equal(timePeriodForHour(24), "dawn");
  assert.equal(timePeriodForHour(-1), "night");
});
