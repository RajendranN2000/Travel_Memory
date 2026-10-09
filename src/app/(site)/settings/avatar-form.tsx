"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/forms/field";
import { UserAvatar, type AvatarUser } from "@/components/site/user-avatar";
import { Button } from "@/components/ui/button";
import { removeAvatar, setAvatar } from "@/features/account/actions";
import {
  AVATAR_BUCKET,
  AVATAR_INPUT_MAX_BYTES,
  AVATAR_INPUT_TYPES,
  AVATAR_MAX_BYTES,
  AVATAR_SIZE,
  avatarStoragePath,
} from "@/features/account/avatar";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Centre-crops the image to a square of at most AVATAR_SIZE pixels and
 * re-encodes it as JPEG, which also strips EXIF data such as GPS location.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("encode");
  return blob;
}

export function AvatarForm({ user, userId }: { user: AvatarUser; userId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [, startTransition] = useTransition();

  const shown: AvatarUser = { ...user, avatarUrl: preview ?? user.avatarUrl };

  const finish = () =>
    startTransition(() => {
      router.refresh();
    });

  const upload = async (file: File) => {
    setError(null);
    if (!(AVATAR_INPUT_TYPES as readonly string[]).includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_INPUT_MAX_BYTES) {
      setError(`That image is over ${AVATAR_INPUT_MAX_BYTES / 1024 / 1024} MB. Choose a smaller one.`);
      return;
    }
    const supabase = getBrowserClient();
    if (!supabase) {
      setError("Uploads are unavailable because Supabase isn't configured.");
      return;
    }
    setBusy("upload");
    let objectUrl: string | null = null;
    try {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        setError("That file couldn't be read as an image.");
        return;
      }
      if (blob.size > AVATAR_MAX_BYTES) {
        setError("That photo is too large. Please choose another one.");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setPreview(objectUrl);

      const path = avatarStoragePath(userId, crypto.randomUUID());
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false, cacheControl: "3600" });
      if (uploadError) {
        const missing = /bucket not found/i.test(uploadError.message);
        setError(missing ? "Profile photos aren't set up yet: apply the latest database migration." : "The upload failed. Check your connection and try again.");
        setPreview(null);
        return;
      }
      const result = await setAvatar(path);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        return;
      }
      toast.success("Profile photo updated");
      finish();
    } finally {
      setBusy(null);
      // Keep the local preview until the refreshed signed URL arrives.
      if (objectUrl) {
        const url = objectUrl;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    }
  };

  const remove = async () => {
    setError(null);
    setBusy("remove");
    const result = await removeAvatar();
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPreview(null);
    toast.success("Profile photo removed");
    finish();
  };

  const hasPhoto = Boolean(shown.avatarUrl);

  return (
    <div className="space-y-4">
      {error ? <FormMessage status="error" message={error} /> : null}
      <div className="flex items-center gap-5">
        <div className="relative">
          <UserAvatar user={shown} className="size-24 text-4xl" />
          {busy === "upload" ? (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white" role="status">
              <Loader2 className="size-6 animate-spin" aria-hidden />
              <span className="sr-only">Uploading photo…</span>
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={input}
            type="file"
            accept={AVATAR_INPUT_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => input.current?.click()}>
            <Camera data-icon="inline-start" /> {hasPhoto ? "Change photo" : "Upload photo"}
          </Button>
          {hasPhoto ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy !== null} onClick={remove}>
              {busy === "remove" ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 data-icon="inline-start" />} Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        A square crop of your photo, shown only to you while signed in. Location data is removed before upload.
      </p>
    </div>
  );
}
