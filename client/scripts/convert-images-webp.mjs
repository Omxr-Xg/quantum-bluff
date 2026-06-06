#!/usr/bin/env node
/**
 * Convertit les PNG/JPEG bundlés en WebP (plus léger, chargement web plus rapide).
 * Usage : npm run convert:webp [-- --delete-source]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.join(__dirname, "..");
const ROOT = path.join(CLIENT, "..");
const DELETE_SOURCE = process.argv.includes("--delete-source");

const TARGET_DIRS = [
  path.join(CLIENT, "src/assets"),
  path.join(CLIENT, "public"),
];

/** Fichiers à garder en PNG (icônes natives / touch). */
const KEEP_PNG = new Set([
  path.join(CLIENT, "public/apple-touch-icon.png"),
  path.join(CLIENT, "app-icon.png"),
]);

const MAX_WIDTH = {
  games: 1280,
  background: 1920,
  avatars: 512,
  nappe: 1920,
  default: 1600,
};

function maxWidthFor(file) {
  const p = file.replace(/\\/g, "/");
  if (p.includes("/games/")) return MAX_WIDTH.games;
  if (p.includes("/background/")) return MAX_WIDTH.background;
  if (p.includes("/avatars/")) return MAX_WIDTH.avatars;
  if (p.includes("/nappe/")) return MAX_WIDTH.nappe;
  if (p.includes("/cards/") || p.includes("/slot-")) return 512;
  return MAX_WIDTH.default;
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(full);
  }
  return out;
}

async function convertOne(file) {
  if (KEEP_PNG.has(file)) {
    const stat = await fs.stat(file);
    if (stat.size > 400_000) {
      const tmp = `${file}.opt.png`;
      await sharp(file).png({ quality: 80, compressionLevel: 9 }).toFile(tmp);
      await fs.rename(tmp, file);
      console.log(`optimized png ${path.relative(ROOT, file)}`);
    }
    return null;
  }

  const webp = file.replace(/\.(png|jpe?g)$/i, ".webp");
  const meta = await sharp(file).metadata();
  const maxW = maxWidthFor(file);
  let pipeline = sharp(file);
  if (meta.width && meta.width > maxW) {
    pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
  }
  const quality = file.includes("/avatars/") || file.includes("/slot-") ? 86 : 80;
  await pipeline.webp({ quality, effort: 4 }).toFile(webp);

  const before = (await fs.stat(file)).size;
  const after = (await fs.stat(webp)).size;
  const pct = Math.round((1 - after / before) * 100);
  console.log(
    `${path.relative(ROOT, file)} → ${path.relative(ROOT, webp)} (${formatKb(before)} → ${formatKb(after)}, -${pct}%)`,
  );

  if (DELETE_SOURCE) await fs.unlink(file);
  return { file, webp, before, after };
}

function formatKb(n) {
  return `${Math.round(n / 1024)} Ko`;
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) await walk(dir, files);
  if (files.length === 0) {
    console.log("Aucune image à convertir.");
    return;
  }

  let saved = 0;
  for (const f of files.sort()) {
    const r = await convertOne(f);
    if (r) saved += r.before - r.after;
  }
  console.log(`\nÉconomie totale : ~${formatKb(saved)}`);
  if (!DELETE_SOURCE) console.log("Relance avec --delete-source pour supprimer les PNG sources.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
