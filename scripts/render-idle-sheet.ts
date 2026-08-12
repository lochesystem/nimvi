import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { buildPixelFrame, generateGenome, GRID_SIZE } from "../app/nimvi/generator.ts";

const scale = 16;
const columns = 4;
const frames = Array.from({ length: columns }, (_, index) =>
  buildPixelFrame(generateGenome("NIMVIQA2026"), 2, index, "idle"),
);
const width = GRID_SIZE * columns;
const height = GRID_SIZE;
const rgba = Buffer.alloc(width * height * 4);

for (let frameIndex = 0; frameIndex < columns; frameIndex += 1) {
  frames[frameIndex].forEach((row, y) => row.forEach((color, x) => {
    if (!color) return;
    const hex = color.slice(1);
    const offset = (y * width + frameIndex * GRID_SIZE + x) * 4;
    rgba[offset] = Number.parseInt(hex.slice(0, 2), 16);
    rgba[offset + 1] = Number.parseInt(hex.slice(2, 4), 16);
    rgba[offset + 2] = Number.parseInt(hex.slice(4, 6), 16);
    rgba[offset + 3] = 255;
  }));
}

await mkdir("docs/assets", { recursive: true });
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .resize(width * scale, height * scale, { kernel: "nearest" })
  .png()
  .toFile("docs/assets/nimvi-idle-sheet.png");
