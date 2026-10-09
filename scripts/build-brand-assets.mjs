/**
 * Builds the logo and app icons from the master logo PNG (transparent background).
 *
 *   node scripts/build-brand-assets.mjs <path-to-master.png>
 *
 * Writes:
 *   public/brand/logo-mark.png  emblem only (mountains, sun, river), used in the header
 *   public/brand/logo.png       full stacked logo with the TRAVEL MEMORY wordmark
 *   src/app/icon.png            512×512 favicon / PWA icon
 *   src/app/apple-icon.png      180×180 home-screen icon on the paper background
 *   src/app/favicon.ico         16/32/48 px browser tab icon
 *
 * The master file is kept at assets/brand/travel-memory-logo-master.png.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const master = process.argv[2];
if (!master) {
  console.error("Usage: node scripts/build-brand-assets.mjs <master.png>");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const out = (p) => path.join(root, p);
await mkdir(out("public/brand"), { recursive: true });

const meta = await sharp(master).metadata();
// The emblem sits above the wordmark; the wordmark starts at roughly 62% of the height.
const emblemBottom = Math.round(meta.height * 0.62);

// sharp applies trim before extract within one pipeline, so do them in two steps.
const emblemArea = await sharp(master).extract({ left: 0, top: 0, width: meta.width, height: emblemBottom }).png().toBuffer();
const emblem = await sharp(emblemArea).trim({ threshold: 10 }).png().toBuffer();
const full = await sharp(master).trim({ threshold: 10 }).png().toBuffer();

await sharp(emblem).resize({ height: 192 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(out("public/brand/logo-mark.png"));
await sharp(full).resize({ width: 720 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(out("public/brand/logo.png"));

async function square(size, padding, background) {
  const inner = size - padding * 2;
  const mark = await sharp(emblem).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, left: padding, top: padding }])
    .png({ compressionLevel: 9 });
}

await (await square(512, 24, { r: 0, g: 0, b: 0, alpha: 0 })).toFile(out("src/app/icon.png"));
await (await square(180, 18, { r: 247, g: 243, b: 236, alpha: 1 })).toFile(out("src/app/apple-icon.png"));

// favicon.ico for browsers that request it directly: ICO files may embed PNGs.
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map(async (s) => (await square(s, 0, { r: 0, g: 0, b: 0, alpha: 0 })).toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const entries = icoSizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
await writeFile(out("src/app/favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));

for (const f of ["public/brand/logo-mark.png", "public/brand/logo.png", "src/app/icon.png", "src/app/apple-icon.png"]) {
  const m = await sharp(out(f)).metadata();
  console.log(`${f}: ${m.width}×${m.height}`);
}
