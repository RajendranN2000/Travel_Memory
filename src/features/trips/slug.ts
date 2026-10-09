/** Lowercase, ASCII, hyphen-separated slug fragment from free text. */
export function slugify(input: string, maxLength = 60): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return base;
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** Unguessable suffix (~50 bits) so unlisted links cannot be enumerated. */
export function randomSuffix(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Public memory slug: readable title prefix plus a random suffix. Never starts with "sample-". */
export function memorySlug(title: string): string {
  let base = slugify(title, 50);
  if (!base || base.startsWith("sample")) base = base ? `trip-${base}` : "trip";
  return `${base}-${randomSuffix()}`;
}
