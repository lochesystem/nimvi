import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { buildPixelFrame, generateGenome, GRID_SIZE } from "../app/nimvi/generator.ts";

const columns = 3;
const rows = 6;
const scale = 12;
const width = GRID_SIZE * columns;
const height = GRID_SIZE * rows;
const rgba = Buffer.alloc(width * height * 4);
const genome = generateGenome("NIMVI-EVOLUTION-SHEET");

for (let lineage = 0; lineage < rows; lineage += 1) {
  for (let stage = 1; stage <= columns; stage += 1) {
    const frame = buildPixelFrame({ ...genome, body: lineage, palette: lineage % 8 }, stage as 1 | 2 | 3, 0, "idle");
    frame.forEach((row, y) => row.forEach((color, x) => {
      if (!color) return;
      const hex = color.slice(1);
      const targetX = (stage - 1) * GRID_SIZE + x;
      const targetY = lineage * GRID_SIZE + y;
      const offset = (targetY * width + targetX) * 4;
      rgba[offset] = Number.parseInt(hex.slice(0, 2), 16);
      rgba[offset + 1] = Number.parseInt(hex.slice(2, 4), 16);
      rgba[offset + 2] = Number.parseInt(hex.slice(4, 6), 16);
      rgba[offset + 3] = 255;
    }));
  }
}

await mkdir("docs/assets", { recursive: true });
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .flatten({ background: "#f7f1df" })
  .resize(width * scale, height * scale, { kernel: "nearest" })
  .png()
  .toFile("docs/assets/nimvi-evolution-sheet.png");
