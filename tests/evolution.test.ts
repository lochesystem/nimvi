import assert from "node:assert/strict";
import test from "node:test";

import { EVOLUTION_MIN_AGE_MS, evolutionForModel, evolutionReadiness } from "../app/nimvi/evolution.ts";
import { createFreshSave, parseSave } from "../app/nimvi/generator.ts";

const now = 1_800_000_000_000;

test("somente modelos com estágio 2 desenhado podem evoluir", () => {
  assert.equal(evolutionForModel(2)?.name, "Velume");
  assert.equal(evolutionForModel(4)?.name, "Soruli");
  assert.equal(evolutionForModel(7)?.name, "Tobiru");
  assert.equal(evolutionForModel(9)?.name, "Lumeli");
  for (const model of [0, 1, 3, 5, 6, 8, 10, 22]) assert.equal(evolutionForModel(model), null);
});

test("evolução exige três dias, vínculo e saúde", () => {
  const save = createFreshSave("N2TOBIRU0000");
  save.bornAt = now - EVOLUTION_MIN_AGE_MS;
  save.bond = 20;
  save.care.health = 70;
  save.care.illness = "none";
  assert.deepEqual(evolutionReadiness(save, now), { ageReady: true, bondReady: true, healthReady: true, ready: true });

  save.care.illness = "cold";
  assert.equal(evolutionReadiness(save, now).ready, false);
});

test("save legado começa no estágio 1", () => {
  const legacy = createFreshSave("N2LEGACY0001");
  const raw = JSON.stringify({ ...legacy, version: 3, evolutionStage: undefined });
  const migrated = parseSave(raw);
  assert.equal(migrated?.version, 4);
  assert.equal(migrated?.evolutionStage, 1);
});
