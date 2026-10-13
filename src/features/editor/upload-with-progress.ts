import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/env";

export type PhotoUploadResult = { ok: true } | { ok: false; aborted: boolean };

const BUCKET = "trip-photos";
const CACHE_CONTROL = "31536000";
const ALREADY_THERE = /exists|duplicate/i;

/**
 * Uploads through XMLHttpRequest, because fetch (and so the standard Supabase
 * upload) can't report how many bytes have been sent. This calls the same
 * storage endpoint with the user's own session, so the same access rules apply.
 */
function xhrUpload(opts: {
  url: string;
  key: string;
  token: string;
  blob: Blob;
  onProgress: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<PhotoUploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", opts.url);
    xhr.setRequestHeader("apikey", opts.key);
    xhr.setRequestHeader("Authorization", `Bearer ${opts.token}`);
    xhr.setRequestHeader("x-upsert", "false");

    const form = new FormData();
    form.append("cacheControl", CACHE_CONTROL);
    form.append("", opts.blob);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) opts.onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      // A retry after a dropped connection may find the file already stored.
      resolve(ALREADY_THERE.test(xhr.responseText) ? { ok: true } : { ok: false, aborted: false });
    };
    xhr.onerror = () => resolve({ ok: false, aborted: false });
    xhr.onabort = () => resolve({ ok: false, aborted: true });
    opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    if (opts.signal?.aborted) return resolve({ ok: false, aborted: true });
    xhr.send(form);
  });
}

/**
 * Uploads a photo to the user's private folder, reporting progress (0 to 1).
 * If the progress-reporting request fails for any reason other than being
 * cancelled, it falls back to the standard Supabase upload, so progress is a
 * bonus and never the reason an upload fails.
 */
export async function uploadPhoto(
  supabase: SupabaseClient<Database>,
  path: string,
  blob: Blob,
  contentType: string,
  opts: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<PhotoUploadResult> {
  const config = getSupabaseConfig();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (config && token && opts.onProgress) {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const result = await xhrUpload({
      url: `${config.url}/storage/v1/object/${BUCKET}/${encoded}`,
      key: config.key,
      token,
      blob,
      onProgress: opts.onProgress,
      signal: opts.signal,
    });
    if (result.ok || result.aborted) return result;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false, cacheControl: CACHE_CONTROL });
  if (error && !ALREADY_THERE.test(error.message)) return { ok: false, aborted: false };
  opts.onProgress?.(1);
  return { ok: true };
}
