import assert from "node:assert/strict";
import test from "node:test";

import { advanceCare, careMood, performCareAction } from "../app/nimvi/care.ts";
import { createFreshSave, parseSave } from "../app/nimvi/generator.ts";

const at = 1_800_000_000_000;

test("necessidades avançam pelo tempo mesmo fora da aba", () => {
  const save = createFreshSave("N2CARE000001");
  save.care.lastUpdatedAt = at;
  const next = advanceCare(save, at + 2 * 60 * 60_000);
  assert.ok(next.care.hunger > save.care.hunger);
  assert.ok(next.care.hygiene < save.care.hygiene);
  assert.ok(next.care.energy < save.care.energy);
});

test("sono recupera energia e termina quando o Nimvi está descansado", () => {
  const save = createFreshSave("N2CARE000002");
  save.care = { ...save.care, energy: 20, isSleeping: true, sleepStartedAt: at, lastUpdatedAt: at };
  const next = advanceCare(save, at + 4 * 60 * 60_000);
  assert.equal(next.care.energy, 100);
  assert.equal(next.care.isSleeping, false);
});

test("não aceita comida quando está satisfeito", () => {
  const save = createFreshSave("N2CARE000003");
  const result = performCareAction(save, "feed", save.care.lastUpdatedAt + 10 * 60_000);
  assert.equal(result.accepted, false);
  assert.equal(result.save.metrics.refusals, 1);
});

test("brincadeira é recusada quando está cansado", () => {
  const save = createFreshSave("N2CARE000004");
  save.care.energy = 15;
  const result = performCareAction(save, "play", save.care.lastUpdatedAt + 10 * 60_000);
  assert.equal(result.accepted, false);
  assert.match(result.notice, /cansado|bocejou/);
});

test("negligência acumulada causa doença tratável", () => {
  const save = createFreshSave("N2CARE000005");
  save.care = { ...save.care, hunger: 95, hygiene: 10, energy: 8, lastUpdatedAt: at };
  const sick = advanceCare(save, at + 2 * 60 * 60_000);
  assert.notEqual(sick.care.illness, "none");
  const treated = performCareAction(sick, "medicine", at + 2 * 60 * 60_000 + 1);
  assert.equal(treated.accepted, true);
  assert.equal(treated.save.care.illness, "none");
  assert.equal(treated.save.metrics.medicines, 1);
});

test("medicamento é recusado quando está saudável", () => {
  const save = createFreshSave("N2CARE000006");
  const result = performCareAction(save, "medicine", save.care.lastUpdatedAt + 1);
  assert.equal(result.accepted, false);
});

test("cooldown impede interação infinita", () => {
  const save = createFreshSave("N2CARE000007");
  save.care = { ...save.care, hunger: 50, lastUpdatedAt: at };
  const first = performCareAction(save, "feed", at);
  const second = performCareAction(first.save, "feed", at + 30_000);
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
});

test("save antigo migra sem trocar DNA e recebe o estado de cuidado", () => {
  const raw = JSON.stringify({
    version: 1,
    seed: "DNALEGADO123",
    bornAt: at,
    lastSeenAt: at,
    bond: 12,
    metrics: { visits: 4, interactions: 2, focusReturns: 1, hiddenSeconds: 20, resizes: 0, nightVisits: 0 },
  });
  const migrated = parseSave(raw);
  assert.equal(migrated?.version, 2);
  assert.equal(migrated?.seed, "DNALEGADO123");
  assert.ok(migrated?.care);
  assert.equal(migrated?.metrics.meals, 0);
});

test("humor resume a necessidade prioritária", () => {
  const save = createFreshSave("N2CARE000008");
  save.care.hunger = 90;
  assert.equal(careMood(save.care), "com fome");
});
