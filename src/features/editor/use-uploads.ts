"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { deletePhoto, registerPhoto, replacePhoto } from "@/features/trips/actions";
import { LIMITS, photoStoragePath } from "@/features/trips/schemas";
import type { EditorPhoto } from "@/features/trips/types";
import { checkFile, partitionFiles } from "./upload-validation";

export type UploadStatus = "queued" | "processing" | "uploading" | "saving" | "error";

export interface UploadItem {
  localId: string;
  name: string;
  /** Temporary object URL for the preview only. Never persisted. */
  previewUrl: string;
  status: UploadStatus;
  error?: string;
}

const MAX_CONCURRENT = 2;
const OUTPUT_TYPE = "image/jpeg";

async function compress(file: File, signal: AbortSignal): Promise<{ blob: Blob; width: number; height: number }> {
  const { default: imageCompression } = await import("browser-image-compression");
  // Re-encoding through a canvas strips EXIF metadata, including GPS location.
  const blob = await imageCompression(file, {
    maxWidthOrHeight: LIMITS.maxDimension,
    maxSizeMB: 3,
    initialQuality: 0.86,
    fileType: OUTPUT_TYPE,
    useWebWorker: true,
    preserveExif: false,
    signal,
  });
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (blob.size > LIMITS.maxUploadBytes) throw new Error("too-large");
  return { blob, ...size };
}

/**
 * Manages the upload queue: validate → preview → compress in the browser →
 * upload to the user's private storage folder → register with the server.
 * In demo mode photos stay local to the tab and are labelled as such.
 */
export function useUploads({
  tripId,
  userId,
  demo,
  photoCount,
  onUploaded,
}: {
  tripId: string;
  userId: string | null;
  demo: boolean;
  photoCount: number;
  onUploaded: (photo: EditorPhoto) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  /** Ids of photos whose image is being swapped */
  const [replacing, setReplacing] = useState<Set<string>>(new Set());
  const files = useRef(new Map<string, File>());
  const active = useRef(0);
  const started = useRef(new Set<string>());
  const urls = useRef(new Set<string>());
  /** Abort controllers for uploads in flight; aborted means the user cancelled. */
  const controllers = useRef(new Map<string, AbortController>());
  const onUploadedRef = useRef(onUploaded);
  const queueRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);
  useEffect(() => {
    queueRef.current = items;
  }, [items]);

  const patch = useCallback((localId: string, update: Partial<UploadItem>) => {
    setItems((list) => list.map((i) => (i.localId === localId ? { ...i, ...update } : i)));
  }, []);

  const finish = useCallback((localId: string, keepUrl: boolean) => {
    setItems((list) => {
      const item = list.find((i) => i.localId === localId);
      if (item && !keepUrl) {
        URL.revokeObjectURL(item.previewUrl);
        urls.current.delete(item.previewUrl);
      }
      return list.filter((i) => i.localId !== localId);
    });
    files.current.delete(localId);
  }, []);

  const process = useCallback(
    async (item: UploadItem) => {
      const file = files.current.get(item.localId);
      if (!file) return;
      const controller = new AbortController();
      controllers.current.set(item.localId, controller);
      const cancelled = () => controller.signal.aborted;
      active.current += 1;
      try {
        patch(item.localId, { status: "processing", error: undefined });
        let compressed: Awaited<ReturnType<typeof compress>>;
        try {
          compressed = await compress(file, controller.signal);
        } catch (e) {
          if (cancelled()) return;
          const reason = e instanceof Error && e.message === "too-large" ? "is still over 10 MB after compression" : "couldn't be read as an image";
          patch(item.localId, { status: "error", error: `This photo ${reason}.` });
          return;
        }
        if (cancelled()) return;

        if (demo || !userId) {
          onUploadedRef.current({
            id: item.localId,
            storagePath: "",
            url: item.previewUrl,
            width: compressed.width,
            height: compressed.height,
            caption: "",
            location: "",
            takenOn: null,
            frame: {},
          });
          finish(item.localId, true);
          return;
        }

        const supabase = getBrowserClient();
        if (!supabase) {
          patch(item.localId, { status: "error", error: "Uploads are unavailable because Supabase isn't configured." });
          return;
        }

        patch(item.localId, { status: "uploading" });
        const path = photoStoragePath(userId, tripId, item.localId, OUTPUT_TYPE, item.name);
        const { error: uploadError } = await supabase.storage
          .from("trip-photos")
          .upload(path, compressed.blob, { contentType: OUTPUT_TYPE, upsert: false, cacheControl: "31536000" });
        if (uploadError && !/exists|duplicate/i.test(uploadError.message)) {
          if (cancelled()) return;
          patch(item.localId, { status: "error", error: "The upload failed. Check your connection and try again." });
          return;
        }
        if (cancelled()) {
          // The file reached storage but was never registered: remove it again.
          await supabase.storage.from("trip-photos").remove([path]);
          return;
        }

        patch(item.localId, { status: "saving" });
        const result = await registerPhoto({
          photoId: item.localId,
          tripId,
          storagePath: path,
          width: compressed.width,
          height: compressed.height,
        });
        if (!result.ok) {
          if (cancelled()) {
            await supabase.storage.from("trip-photos").remove([path]);
            return;
          }
          patch(item.localId, { status: "error", error: result.error });
          return;
        }
        if (cancelled()) {
          // Cancelled while the server was saving it. Delete it; if that fails the
          // photo really exists, so show it rather than pretend it's gone.
          const removed = await deletePhoto(result.data.id);
          if (!removed.ok) onUploadedRef.current(result.data);
          return;
        }
        onUploadedRef.current(result.data);
        finish(item.localId, false);
      } catch {
        if (!cancelled()) patch(item.localId, { status: "error", error: "Something went wrong with this upload. Try again." });
      } finally {
        controllers.current.delete(item.localId);
        active.current -= 1;
      }
    },
    [demo, finish, patch, tripId, userId],
  );

  // Start queued uploads while respecting the concurrency limit.
  useEffect(() => {
    const queued = items.filter((i) => i.status === "queued" && !started.current.has(i.localId));
    const slots = MAX_CONCURRENT - active.current;
    for (const item of queued.slice(0, Math.max(0, slots))) {
      started.current.add(item.localId);
      void process(item);
    }
  }, [items, process]);

  const add = useCallback(
    (selected: File[]): string[] => {
      const pendingCount = queueRef.current.length;
      const { accepted, rejected } = partitionFiles(selected, photoCount + pendingCount);
      const next: UploadItem[] = accepted.map((file) => {
        const localId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        urls.current.add(previewUrl);
        files.current.set(localId, file);
        return { localId, name: file.name, previewUrl, status: "queued" };
      });
      if (next.length > 0) setItems((list) => [...list, ...next]);
      return rejected;
    },
    [photoCount],
  );

  const retry = useCallback(
    (localId: string) => {
      started.current.delete(localId);
      patch(localId, { status: "queued", error: undefined });
    },
    [patch],
  );
  /** Removes a queued or failed item, or cancels one that is in progress. */
  const remove = useCallback(
    (localId: string) => {
      controllers.current.get(localId)?.abort();
      finish(localId, false);
    },
    [finish],
  );

  // Revoke any object URLs still alive when the editor unmounts.
  useEffect(() => {
    const all = urls.current;
    return () => {
      for (const url of all) URL.revokeObjectURL(url);
      all.clear();
    };
  }, []);

  /**
   * Swaps the image of an existing photo. Resolves with the updated photo, or a
   * readable error; the caption, place, day and order are kept.
   */
  const replace = useCallback(
    async (photo: EditorPhoto, file: File): Promise<{ ok: true; photo: EditorPhoto } | { ok: false; error: string }> => {
      const check = checkFile(file);
      if (!check.ok) return { ok: false, error: check.reason };
      setReplacing((ids) => new Set(ids).add(photo.id));
      try {
        let compressed: Awaited<ReturnType<typeof compress>>;
        try {
          compressed = await compress(file, new AbortController().signal);
        } catch (e) {
          const reason = e instanceof Error && e.message === "too-large" ? "is still over 10 MB after compression" : "couldn't be read as an image";
          return { ok: false, error: `This photo ${reason}.` };
        }

        if (demo || !userId) {
          const url = URL.createObjectURL(compressed.blob);
          urls.current.add(url);
          return { ok: true, photo: { ...photo, url, width: compressed.width, height: compressed.height, frame: {} } };
        }

        const supabase = getBrowserClient();
        if (!supabase) return { ok: false, error: "Uploads are unavailable because Supabase isn't configured." };
        const path = photoStoragePath(userId, tripId, crypto.randomUUID(), OUTPUT_TYPE, file.name);
        const { error: uploadError } = await supabase.storage
          .from("trip-photos")
          .upload(path, compressed.blob, { contentType: OUTPUT_TYPE, upsert: false, cacheControl: "31536000" });
        if (uploadError) return { ok: false, error: "The upload failed. Check your connection and try again." };

        const result = await replacePhoto({ photoId: photo.id, storagePath: path, width: compressed.width, height: compressed.height });
        if (!result.ok) {
          await supabase.storage.from("trip-photos").remove([path]);
          return { ok: false, error: result.error };
        }
        return { ok: true, photo: result.data };
      } catch {
        return { ok: false, error: "Something went wrong replacing this photo. Try again." };
      } finally {
        setReplacing((ids) => {
          const next = new Set(ids);
          next.delete(photo.id);
          return next;
        });
      }
    },
    [demo, tripId, userId],
  );

  const busy = items.some((i) => i.status !== "error") || replacing.size > 0;
  return { items, add, retry, remove, replace, replacing, busy };
}
