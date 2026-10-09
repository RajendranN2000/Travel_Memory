/** Profile photo storage: private bucket, one folder per user. Shared by client and server. */

export const AVATAR_BUCKET = "avatars";
/** Longest edge of the stored square profile photo, in pixels. */
export const AVATAR_SIZE = 512;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_INPUT_MAX_BYTES = 15 * 1024 * 1024;
export const AVATAR_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const AVATAR_PATH = new RegExp(`^(${UUID})/${UUID}\\.jpg$`);

export function avatarStoragePath(userId: string, fileId: string) {
  return `${userId}/${fileId}.jpg`;
}

/** True when `path` is a well-formed avatar path inside this user's folder. */
export function isOwnedAvatarPath(userId: string, path: string) {
  const match = AVATAR_PATH.exec(path);
  return Boolean(match && match[1] === userId.toLowerCase());
}

export function initialOf(name: string | null | undefined, email: string | null | undefined) {
  return (name ?? email ?? "?").trim().charAt(0).toUpperCase() || "?";
}
