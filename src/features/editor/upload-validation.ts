import { ACCEPTED_INPUT_TYPES, LIMITS } from "@/features/trips/schemas";

export type FileCheck = { ok: true } | { ok: false; reason: string };

const HEIC = /\.(heic|heif)$/i;

function formatMB(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Checks a selected file before any processing happens in the browser. */
export function checkFile(file: { name: string; type: string; size: number }): FileCheck {
  if (HEIC.test(file.name) || /hei[cf]/i.test(file.type)) {
    return {
      ok: false,
      reason: `${file.name}: HEIC photos aren't supported yet. Export it as JPEG (on iPhone: Settings → Camera → Formats → Most Compatible).`,
    };
  }
  if (!(ACCEPTED_INPUT_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: `${file.name}: only JPEG, PNG and WebP images can be uploaded.` };
  }
  if (file.size <= 0) return { ok: false, reason: `${file.name}: the file is empty.` };
  if (file.size > LIMITS.maxInputBytes) {
    return { ok: false, reason: `${file.name}: files must be under ${formatMB(LIMITS.maxInputBytes)}.` };
  }
  return { ok: true };
}

/**
 * Splits a selection into accepted files and readable rejection messages,
 * respecting the per-trip photo limit.
 */
export function partitionFiles<T extends { name: string; type: string; size: number }>(
  files: T[],
  existingCount: number,
): { accepted: T[]; rejected: string[] } {
  const accepted: T[] = [];
  const rejected: string[] = [];
  let room = Math.max(0, LIMITS.photosPerTrip - existingCount);
  for (const file of files) {
    const check = checkFile(file);
    if (!check.ok) {
      rejected.push(check.reason);
      continue;
    }
    if (room <= 0) {
      rejected.push(`${file.name}: this trip already has the maximum of ${LIMITS.photosPerTrip} photos.`);
      continue;
    }
    room -= 1;
    accepted.push(file);
  }
  return { accepted, rejected };
}
