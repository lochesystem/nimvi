import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildPixelFrame, frameSignature, generateGenome, GRID_SIZE, PALETTES, parseSave } from "../app/nimvi/generator.ts";
import { SLEEP_FRAME_INDEX, SPRITE_COLUMNS } from "../app/nimvi/spriteCatalog.ts";

const silhouetteSimilarity = (left: ReturnType<typeof buildPixelFrame>, right: ReturnType<typeof buildPixelFrame>) => {
  const occupied = (frame: ReturnType<typeof buildPixelFrame>) => new Set(frame.flat().map((pixel, index) => pixel ? index : null).filter((index): index is number => index !== null));
  const leftPixels = occupied(left);
  const rightPixels = occupied(right);
  const intersection = [...leftPixels].filter((pixel) => rightPixels.has(pixel)).length;
  return intersection / new Set([...leftPixels, ...rightPixels]).size;
};

test("o mesmo DNA sempre produz o mesmo Nimvi", () => {
  assert.deepEqual(generateGenome("NIMVI-TESTE-01"), generateGenome("NIMVI-TESTE-01"));
});

test("DNAs diferentes produzem genomas diferentes", () => {
  assert.notDeepEqual(generateGenome("NIMVI-ALFA-01"), generateGenome("NIMVI-BETA-02"));
});

test("modelos assinatura permanecem exatamente no catálogo", () => {
  const expected = new Map([
    ["ICON00000B5", "1d561badda1497fd2ce6dc84924411fc53bf98428f355c4107a49ca8ca7845d5"],
    ["ICON00000B0", "b48c6e24fc7f37d5efddd0345419efa9e9630e060c8cc2052595f50fb2294824"],
  ]);
  expected.forEach((hash, seed) => {
    const frame = buildPixelFrame(generateGenome(seed), 1, 0, "idle");
    const signature = createHash("sha256").update(frameSignature(frame)).digest("hex");
    assert.equal(signature, hash, `${seed}: o template assinatura foi alterado`);
  });
});

test("save inválido não hidrata o jogo", () => {
  assert.equal(parseSave("{quebrado"), null);
  assert.equal(parseSave(JSON.stringify({ version: 99, seed: "X" })), null);
});

test("idle procedural tem frames distintos e mantém a baseline", () => {
  const genome = generateGenome("ANIMACAO-01");
  const frames = [0, 1, 2, 3].map((index) => buildPixelFrame(genome, 2, index, "idle"));
  const signatures = new Set(frames.map(frameSignature));
  assert.ok(signatures.size >= 3, `esperava ao menos 3 frames únicos, recebi ${signatures.size}`);
  frames.forEach((frame) => {
    assert.ok(frame.slice(-4).flat().some(Boolean), "cada frame precisa manter contato com a baseline inferior");
    assert.equal(frame.length, GRID_SIZE);
    frame.forEach((row) => assert.equal(row.length, GRID_SIZE));
  });
});

test("sono usa a pose final de olhos fechados sem avançar o idle", () => {
  assert.equal(SLEEP_FRAME_INDEX, SPRITE_COLUMNS - 1);
});

test("os dois olhos mantêm a mesma leitura entre poses abertas", () => {
  const base = generateGenome("NIMVI-EYES-QA");
  for (let body = 0; body < 6; body += 1) {
    const genome = { ...base, body, eyes: 6 };
    const eyeColor = PALETTES[genome.palette].eyes;
    const counts = [0, 1, 3].map((phase) =>
      buildPixelFrame(genome, 2, phase, "idle").flat().filter((pixel) => pixel === eyeColor).length,
    );
    assert.equal(counts[0], counts[1], `linhagem ${body}: pose alongada alterou apenas um olho`);
    assert.equal(counts[0], counts[2], `linhagem ${body}: pose comprimida alterou apenas um olho`);
  }
});

test("DNA 0V250E1Y003Y mantém os olhos alinhados", () => {
  const genome = generateGenome("0V250E1Y003Y");
  const eyeColor = PALETTES[genome.palette].eyes;
  for (const stage of [1, 2, 3] as const) {
    const points = buildPixelFrame(genome, stage, 0, "idle").flatMap((row, y) =>
      row.flatMap((pixel, x) => pixel === eyeColor && y >= 15 ? [[x, y] as const] : []),
    );
    const xs = [...new Set(points.map(([x]) => x))].sort((a, b) => a - b);
    const split = (xs[Math.floor(xs.length / 2) - 1] + xs[Math.floor(xs.length / 2)]) / 2;
    const bounds = (side: "left" | "right") => {
      const ys = points.filter(([x]) => side === "left" ? x < split : x > split).map(([, y]) => y);
      return [Math.min(...ys), Math.max(...ys)];
    };
    assert.deepEqual(bounds("left"), bounds("right"), `estágio ${stage}: olhos desalinhados`);
  }
});

test("DNA 53451Q301113 movimenta a antena direita", () => {
  const genome = generateGenome("53451Q301113");
  const rightAntenna = (stage: 1 | 2 | 3, phase: number) => buildPixelFrame(genome, stage, phase, "idle")
    .slice(0, 16)
    .map((row) => row.slice(16).map((pixel) => pixel ?? ".").join("|")).join("\n");
  for (const stage of [1, 2, 3] as const) {
    assert.notEqual(rightAntenna(stage, 0), rightAntenna(stage, 1), `estágio ${stage}: antena direita parada na inspiração`);
    assert.notEqual(rightAntenna(stage, 0), rightAntenna(stage, 3), `estágio ${stage}: antena direita parada na expiração`);
  }
});

test("respiração não cria linha de contorno dentro do corpo", () => {
  for (const seed of ["0V250E1Y003Y", "53451Q301113"]) {
    const genome = generateGenome(seed);
    const outline = PALETTES[genome.palette].outline;
    for (const stage of [1, 2, 3] as const) {
      for (const phase of [1, 3]) {
        const frame = buildPixelFrame(genome, stage, phase, "idle");
        for (let y = 2; y < GRID_SIZE - 2; y += 1) {
          let longestRun = 0;
          let currentRun = 0;
          for (let x = 1; x < GRID_SIZE - 1; x += 1) {
            const internalOutline = frame[y][x] === outline && Boolean(frame[y - 1][x]) && Boolean(frame[y + 1][x]);
            currentRun = internalOutline ? currentRun + 1 : 0;
            longestRun = Math.max(longestRun, currentRun);
          }
          assert.ok(longestRun < 4, `${seed} estágio ${stage} fase ${phase}: linha interna de ${longestRun} pixels`);
        }
      }
    }
  }
});

test("cada linhagem muda de silhueta entre os três estágios", () => {
  const genome = generateGenome("EVOLUCAO-QA");
  for (let lineage = 0; lineage < 6; lineage += 1) {
    const candidate = { ...genome, body: lineage };
    const stage1 = buildPixelFrame(candidate, 1, 0, "idle");
    const stage2 = buildPixelFrame(candidate, 2, 0, "idle");
    const stage3 = buildPixelFrame(candidate, 3, 0, "idle");
    assert.ok(silhouetteSimilarity(stage1, stage2) < 0.8, `linhagem ${lineage}: estágio 1 e 2 semelhantes demais`);
    assert.ok(silhouetteSimilarity(stage2, stage3) < 0.82, `linhagem ${lineage}: estágio 2 e 3 semelhantes demais`);
  }
});

test("linhagens maduras têm silhuetas reconhecivelmente diferentes", () => {
  const genome = generateGenome("LINHAGENS-QA");
  const mature = Array.from({ length: 6 }, (_, body) => buildPixelFrame({ ...genome, body }, 3, 0, "idle"));
  for (let left = 0; left < mature.length; left += 1) {
    for (let right = left + 1; right < mature.length; right += 1) {
      assert.ok(silhouetteSimilarity(mature[left], mature[right]) < 0.85, `linhagens ${left} e ${right} semelhantes demais`);
    }
  }
});
