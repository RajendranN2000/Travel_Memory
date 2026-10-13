/**
 * Builds the site logo and the app icons from two master PNGs (transparent background).
 *
 *   node scripts/build-brand-assets.mjs public/brand/Logo.png public/brand/Favicon.png
 *
 * Masters (kept as supplied, never edited):
 *   Logo.png     full logo: emblem and the "My Travel Memory" wordmark
 *   Favicon.png  emblem only
 *
 * Writes:
 *   public/brand/logo-full.png  Logo.png trimmed of its empty margin, used in the headers and footer
 *   public/brand/logo-mark.png  Favicon.png trimmed, used where only the emblem fits (editor header)
 *   src/app/icon.png            512×512 favicon / PWA icon
 *   src/app/apple-icon.png      180×180 home-screen icon on the paper background
 *   src/app/favicon.ico         16/32/48 px browser tab icon
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [logoMaster, faviconMaster] = process.argv.slice(2);
if (!logoMaster || !faviconMaster) {
  console.error("Usage: node scripts/build-brand-assets.mjs <Logo.png> <Favicon.png>");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const out = (p) => path.join(root, p);
await mkdir(out("public/brand"), { recursive: true });

const png = { compressionLevel: 9, palette: true, quality: 90 };
const logoFull = await sharp(logoMaster).trim({ threshold: 10 }).png().toBuffer();
const emblem = await sharp(faviconMaster).trim({ threshold: 10 }).png().toBuffer();

await sharp(logoFull).resize({ width: 720 }).png(png).toFile(out("public/brand/logo-full.png"));
await sharp(emblem).resize({ height: 192 }).png(png).toFile(out("public/brand/logo-mark.png"));

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

for (const f of ["public/brand/logo-full.png", "public/brand/logo-mark.png", "src/app/icon.png", "src/app/apple-icon.png"]) {
  const m = await sharp(out(f)).metadata();
  console.log(`${f}: ${m.width}×${m.height}`);
}
