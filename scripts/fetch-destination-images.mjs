#!/usr/bin/env node
/**
 * Downloads the destination photographs listed in scripts/image-sources.json
 * from Wikimedia Commons, converts them to optimised WebP and records licence
 * and attribution metadata in src/config/generated/destination-images.json.
 *
 * Only licences that allow commercial reuse are accepted; anything else fails
 * the run so that an unlicensed image can never slip into the product.
 *
 *   pnpm images:fetch            # fetch missing images
 *   pnpm images:fetch --force    # re-download everything
 */
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const UA = "TravelMemoryStudio/0.1 (image setup script)";
const MAX_WIDTH = 2400;
const ALLOWED = [/^CC0/i, /^Public domain/i, /^CC BY(-SA)? \d/i];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function get(url, as) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`Failed to fetch ${url}`);
}

const { images } = JSON.parse(await readFile(path.join(root, "scripts/image-sources.json"), "utf8"));
const manifestPath = path.join(root, "src/config/generated/destination-images.json");
let previous = {};
try {
  previous = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {}

// Metadata for every title in batches of 40 (API limit is 50).
const meta = new Map();
for (let i = 0; i < images.length; i += 40) {
  const titles = images.slice(i, i + 40).map((img) => img.title);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
    "&iiprop=url|size|extmetadata&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist" +
    `&iiurlwidth=${MAX_WIDTH}&titles=${encodeURIComponent(titles.join("|"))}`;
  const data = await get(api, "json");
  const normalized = new Map((data.query.normalized ?? []).map((n) => [n.from, n.to]));
  const pages = new Map(Object.values(data.query.pages).map((p) => [p.title, p]));
  for (const t of titles) meta.set(t, pages.get(normalized.get(t) ?? t));
}

const manifest = {};
for (const img of images) {
  const page = meta.get(img.title);
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`No Commons metadata for ${img.title}`);
  const license = stripHtml(info.extmetadata?.LicenseShortName?.value);
  if (!ALLOWED.some((re) => re.test(license))) {
    throw new Error(`${img.title} has licence "${license}", which is not approved for commercial use`);
  }

  const rel = `/images/destinations/${img.destination}/${img.key}.webp`;
  const out = path.join(root, "public", rel);
  const id = `${img.destination}/${img.key}`;
  let exists = false;
  try {
    await access(out);
    exists = true;
  } catch {}

  let entry = previous[id];
  if (force || !exists || !entry || entry.source?.title !== img.title) {
    await sleep(1200);
    const original = await get(info.thumburl ?? info.url);
    await mkdir(path.dirname(out), { recursive: true });
    const pipeline = sharp(original).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
    const written = await pipeline.webp({ quality: 74, effort: 5 }).toFile(out);
    const blur = await sharp(original).resize(16).webp({ quality: 40 }).toBuffer();
    entry = {
      src: rel,
      width: written.width,
      height: written.height,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    };
    console.log(`fetched ${id} (${written.width}x${written.height}, ${Math.round(written.size / 1024)} KB)`);
  }

  manifest[id] = {
    src: entry.src,
    width: entry.width,
    height: entry.height,
    blurDataURL: entry.blurDataURL,
    alt: img.alt,
    source: {
      title: img.title,
      author: stripHtml(info.extmetadata?.Artist?.value) || "Unknown author",
      license,
      licenseUrl: info.extmetadata?.LicenseUrl?.value ?? null,
      url: info.descriptionurl,
    },
  };
}

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${Object.keys(manifest).length} entries to ${path.relative(root, manifestPath)}`);
