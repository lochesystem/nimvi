import assert from "node:assert/strict";
import test from "node:test";

import { generateGenome, PALETTES } from "../app/nimvi/generator.ts";
import {
  SPRITE_MODELS,
  spriteFrameDuration,
  spriteModelForGenome,
  spriteRowForReaction,
} from "../app/nimvi/spriteCatalog.ts";

test("o DNA escolhe somente um dos treze modelos fixos", () => {
  for (let index = 0; index < 100; index += 1) {
    const genome = generateGenome(`CORPO-FIXO-${index}`);
    assert.ok(SPRITE_MODELS.includes(spriteModelForGenome(genome)));
    assert.equal(spriteModelForGenome(genome), SPRITE_MODELS[genome.model % SPRITE_MODELS.length]);
  }
});

test("todos os modelos usam assets fixos versionados", () => {
  for (const model of SPRITE_MODELS) {
    assert.match(model.src, /^\/sprites\/(?:roles\/nimvi-[a-z]+-roles\.png\?v=5|nimvi-[a-z]+\.png\?v=1)$/);
  }
});

test("uma amostra ampla de DNA distribui os treze modelos", () => {
  const models = new Set(Array.from({ length: 1000 }, (_, index) => spriteModelForGenome(generateGenome(`MODELO-${index}`)).name));
  assert.equal(models.size, SPRITE_MODELS.length);
});

test("o DNA ainda distribui as oito paletas", () => {
  const palettes = new Set(Array.from({ length: 500 }, (_, index) => generateGenome(`PALETA-${index}`).palette));
  assert.equal(palettes.size, PALETTES.length);
});

test("cada reação usa sua linha isolada da spritesheet", () => {
  assert.equal(spriteRowForReaction("idle"), 0);
  assert.equal(spriteRowForReaction("blink"), 0);
  assert.equal(spriteRowForReaction("love"), 1);
  assert.equal(spriteRowForReaction("play"), 1);
  assert.equal(spriteRowForReaction("wake"), 0);
});

test("carinho e brincadeira usam ciclos frontais com ritmos próprios", () => {
  assert.equal(spriteFrameDuration("love"), 180);
  assert.equal(spriteFrameDuration("play"), 160);
  assert.equal(spriteFrameDuration("wake"), 240);
});
