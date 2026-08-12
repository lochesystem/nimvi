import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { buildPixelFrame, generateGenome, GRID_SIZE } from "../app/nimvi/generator.ts";

const seeds = ["ICON00000B5", "ICON00000B0"];
const scale = 14;
const gap = 2;
const width = GRID_SIZE * seeds.length + gap;
const height = GRID_SIZE;
const rgba = Buffer.alloc(width * height * 4);

for (let pixel = 0; pixel < width * height; pixel += 1) {
  const offset = pixel * 4;
  rgba[offset] = 247;
  rgba[offset + 1] = 241;
  rgba[offset + 2] = 223;
  rgba[offset + 3] = 255;
}

seeds.forEach((seed, modelIndex) => {
  const frame = buildPixelFrame(generateGenome(seed), 1, 0, "idle");
  frame.forEach((row, y) => row.forEach((color, x) => {
    if (!color) return;
    const hex = color.slice(1);
    const offset = (y * width + modelIndex * (GRID_SIZE + gap) + x) * 4;
    rgba[offset] = Number.parseInt(hex.slice(0, 2), 16);
    rgba[offset + 1] = Number.parseInt(hex.slice(2, 4), 16);
    rgba[offset + 2] = Number.parseInt(hex.slice(4, 6), 16);
    rgba[offset + 3] = 255;
  }));
});

await mkdir("docs/assets", { recursive: true });
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .resize(width * scale, height * scale, { kernel: "nearest" })
  .png()
  .toFile("docs/assets/nimvi-signature-models.png");
