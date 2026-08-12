import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const prefix = process.env.GITHUB_PAGES_PREFIX ?? "/nimvi";
const outputDir = path.resolve("dist/client");

const rewriteTargets = /\.(html|js|css|json|webmanifest|rsc)$/i;

const replacements = [
  ["/_next/", `${prefix}/_next/`],
  ["_next/", `${prefix}/_next/`],
  ["/icon-", `${prefix}/icon-`],
  ["/manifest.webmanifest", `${prefix}/manifest.webmanifest`],
  ["/og.png", `${prefix}/og.png`],
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }

  return files;
}

function rewriteContent(content) {
  let next = content;

  for (const [from, to] of replacements) {
    for (const quote of ['"', "'", "`"]) {
      next = next.replaceAll(`${quote}${from}`, `${quote}${to}`);
    }
  }

  return next
    .replaceAll('"start_url": "/"', `"start_url": "${prefix}/"`)
    .replaceAll(`${prefix}${prefix}/`, `${prefix}/`);
}

const files = (await walk(outputDir)).filter((file) => rewriteTargets.test(file));

for (const file of files) {
  const content = await readFile(file, "utf8");
  const rewritten = rewriteContent(content);
  if (rewritten !== content) await writeFile(file, rewritten);
}

await writeFile(path.join(outputDir, ".nojekyll"), "");
