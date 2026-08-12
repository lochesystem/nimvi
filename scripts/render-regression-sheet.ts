import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { buildPixelFrame, generateGenome, GRID_SIZE } from "../app/nimvi/generator.ts";

const seeds = ["0V250E1Y003Y", "53451Q301113", "ICON00000B5", "ICON00000B0"];
const columns = 4;
const scale = 12;
const width = GRID_SIZE * columns;
const height = GRID_SIZE * seeds.length;
const rgba = Buffer.alloc(width * height * 4);

seeds.forEach((seed, rowIndex) => {
  const genome = generateGenome(seed);
  for (let phase = 0; phase < columns; phase += 1) {
    const frame = buildPixelFrame(genome, 1, phase, "idle");
    frame.forEach((row, y) => row.forEach((color, x) => {
      if (!color) return;
      const hex = color.slice(1);
      const offset = ((rowIndex * GRID_SIZE + y) * width + phase * GRID_SIZE + x) * 4;
      rgba[offset] = Number.parseInt(hex.slice(0, 2), 16);
      rgba[offset + 1] = Number.parseInt(hex.slice(2, 4), 16);
      rgba[offset + 2] = Number.parseInt(hex.slice(4, 6), 16);
      rgba[offset + 3] = 255;
    }));
  }
});

await mkdir("docs/assets", { recursive: true });
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .resize(width * scale, height * scale, { kernel: "nearest" })
  .png()
  .toFile("docs/assets/nimvi-regression-sheet.png");
