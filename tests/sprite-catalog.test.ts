import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

import { createSeed, generateGenome, PALETTES } from "../app/nimvi/generator.ts";
import {
  SPRITE_MODELS,
  spriteFrameDuration,
  spriteModelForGenome,
  spriteRowForReaction,
} from "../app/nimvi/spriteCatalog.ts";

test("o DNA legado continua escolhendo somente um dos treze modelos originais", () => {
  for (let index = 0; index < 100; index += 1) {
    const genome = generateGenome(`CORPO-FIXO-${index}`);
    assert.ok(genome.model < 13);
    assert.equal(spriteModelForGenome(genome), SPRITE_MODELS[genome.model % SPRITE_MODELS.length]);
  }
});

test("novos DNAs podem escolher os vinte e três modelos sem alterar os antigos", () => {
  const models = new Set(Array.from({ length: 4000 }, (_, index) => spriteModelForGenome(generateGenome(`N2MODELO${index}`)).name));
  assert.equal(models.size, SPRITE_MODELS.length);
});

test("novos nascimentos recebem um DNA da coleção ampliada", () => {
  assert.match(createSeed(), /^N2[A-Z0-9]{10}$/);
});

test("todos os modelos usam assets fixos versionados", () => {
  for (const model of SPRITE_MODELS) {
    assert.match(model.src, /^\/sprites\/(?:roles\/nimvi-[a-z]+-roles\.png\?v=5|nimvi-[a-z]+\.png\?v=1)$/);
  }
});

test("uma amostra ampla de DNA legado preserva os treze modelos", () => {
  const models = new Set(Array.from({ length: 1000 }, (_, index) => spriteModelForGenome(generateGenome(`MODELO-${index}`)).name));
  assert.equal(models.size, 13);
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

test("Tobiru possui um asset exclusivo para o estágio 2", async () => {
  await access(new URL("../public/sprites/nimvi-tobiru-stage2.png", import.meta.url));
});

test("Velume possui um asset exclusivo para o estágio 2", async () => {
  await access(new URL("../public/sprites/nimvi-velume-stage2.png", import.meta.url));
});

test("Soruli possui um asset exclusivo para o estágio 2", async () => {
  await access(new URL("../public/sprites/nimvi-soruli-stage2.png", import.meta.url));
});

test("Lumeli possui um asset exclusivo para o estágio 2", async () => {
  await access(new URL("../public/sprites/nimvi-lumeli-stage2.png", import.meta.url));
});

test("a conta DEV possui controles para comparar os estágios evolutivos", async () => {
  const game = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/nimvi/NimviGame.tsx", import.meta.url), "utf8"));
  assert.match(game, /Iniciar evolução Tobiru/);
  assert.match(game, /Ver Tobiru estágio 1/);
  assert.match(game, /Ver Tobiru estágio 2/);
  assert.match(game, /Iniciar evolução Velume/);
  assert.match(game, /Ver Velume estágio 1/);
  assert.match(game, /Ver Velume estágio 2/);
  assert.match(game, /Iniciar evolução Soruli/);
  assert.match(game, /Ver Soruli estágio 1/);
  assert.match(game, /Ver Soruli estágio 2/);
  assert.match(game, /Iniciar evolução Lumeli/);
  assert.match(game, /Ver Lumeli estágio 1/);
  assert.match(game, /Ver Lumeli estágio 2/);
});

test("carinho e brincadeira usam ciclos frontais com ritmos próprios", () => {
  assert.equal(spriteFrameDuration("love"), 180);
  assert.equal(spriteFrameDuration("play"), 160);
  assert.equal(spriteFrameDuration("wake"), 240);
});
