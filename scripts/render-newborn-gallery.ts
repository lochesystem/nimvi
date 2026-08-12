import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { buildPixelFrame, generateGenome, GRID_SIZE } from "../app/nimvi/generator.ts";

const seeds = [
  "ART00000008Z",
  "ART100000054",
  "ART2000001MJ",
  "ART30000000I",
  "ART4000000BL",
  "ART5000000A1",
];
const columns = 3;
const rows = 2;
const gap = 2;
const scale = 12;
const width = GRID_SIZE * columns + gap * (columns - 1);
const height = GRID_SIZE * rows + gap * (rows - 1);
const rgba = Buffer.alloc(width * height * 4);

for (let pixel = 0; pixel < width * height; pixel += 1) {
  const offset = pixel * 4;
  rgba[offset] = 247;
  rgba[offset + 1] = 241;
  rgba[offset + 2] = 223;
  rgba[offset + 3] = 255;
}

seeds.forEach((seed, index) => {
  const frame = buildPixelFrame(generateGenome(seed), 1, 0, "idle");
  const column = index % columns;
  const rowIndex = Math.floor(index / columns);
  frame.forEach((row, y) => row.forEach((color, x) => {
    if (!color) return;
    const hex = color.slice(1);
    const targetX = column * (GRID_SIZE + gap) + x;
    const targetY = rowIndex * (GRID_SIZE + gap) + y;
    const offset = (targetY * width + targetX) * 4;
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
  .toFile("docs/assets/nimvi-newborn-gallery.png");
