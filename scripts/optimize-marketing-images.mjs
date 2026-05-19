// One-off script: convert /public/marketing/*.png to .webp, downsize to 2400px max edge.
// Run: node scripts/optimize-marketing-images.mjs
import sharp from "sharp";
import { readdir, stat, unlink } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "marketing");

const MAX_EDGE = 2400;
const QUALITY = 90;

const fmt = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const files = (await readdir(dir)).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

let totalIn = 0;
let totalOut = 0;

for (const file of files) {
  const inPath = join(dir, file);
  const outPath = join(dir, basename(file, extname(file)) + ".webp");
  const inSize = (await stat(inPath)).size;

  await sharp(inPath)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(outPath);

  const outSize = (await stat(outPath)).size;
  totalIn += inSize;
  totalOut += outSize;

  const pct = ((1 - outSize / inSize) * 100).toFixed(0);
  console.log(`${file.padEnd(36)} ${fmt(inSize).padStart(10)}  ->  ${basename(outPath).padEnd(36)} ${fmt(outSize).padStart(10)}  (${pct}% smaller)`);

  // Remove the original PNG/JPG if a new WebP was produced
  if (inPath !== outPath) await unlink(inPath);
}

console.log("");
console.log(`Total: ${fmt(totalIn)}  ->  ${fmt(totalOut)}  (${(((1 - totalOut / totalIn) * 100)).toFixed(1)}% smaller)`);
