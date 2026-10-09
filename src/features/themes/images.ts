import manifest from "@/config/generated/destination-images.json";
import type { ImageAsset, ImageKey } from "./types";

const images = manifest as Record<string, ImageAsset>;

/** Looks up a destination photograph; returns null when the asset is missing. */
export function getDestinationImage(key: ImageKey | undefined | null): ImageAsset | null {
  if (!key) return null;
  return images[key] ?? null;
}

export function getDestinationImages(keys: ImageKey[]): ImageAsset[] {
  return keys.map(getDestinationImage).filter((img): img is ImageAsset => img !== null);
}

/** Every photograph with its attribution, for the credits page. */
export function getAllImageCredits(): Array<ImageAsset & { key: string }> {
  return Object.entries(images).map(([key, img]) => ({ key, ...img }));
}
