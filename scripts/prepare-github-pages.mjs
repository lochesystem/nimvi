import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
if (!basePath) {
  throw new Error("NEXT_PUBLIC_BASE_PATH is required to prepare GitHub Pages output.");
}

const outputDir = path.resolve("dist/client");
const manifestPath = path.join(outputDir, "manifest.webmanifest");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.start_url = `${basePath}/`;
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: icon.src.startsWith(basePath) ? icon.src : `${basePath}${icon.src}`,
}));

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(outputDir, ".nojekyll"), "");
