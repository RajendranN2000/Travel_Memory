import type { AspectKey } from "../types";

/** Fractions of the frame that social apps tend to cover with their own buttons and captions. */
export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function safeInsets(aspect: AspectKey): Insets {
  switch (aspect) {
    case "9:16":
      return { top: 0.14, bottom: 0.22, left: 0.06, right: 0.12 };
    case "4:5":
      return { top: 0.06, bottom: 0.1, left: 0.06, right: 0.06 };
    default:
      return { top: 0.07, bottom: 0.09, left: 0.06, right: 0.06 };
  }
}

/** Handy vertical positions (0-1) that stay inside the safe area. */
export function snapBounds(aspect: AspectKey): { top: number; center: number; lowerThird: number } {
  const i = safeInsets(aspect);
  return { top: i.top + 0.07, center: 0.5, lowerThird: 1 - i.bottom - 0.06 };
}
