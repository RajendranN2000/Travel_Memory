import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// next/font is compiled by Next.js; in unit tests return stable class names.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font-var", style: { fontFamily: "test" } });
  const names = ["Bricolage_Grotesque", "Plus_Jakarta_Sans", "Caveat", "Cormorant_Garamond", "DM_Sans", "DM_Serif_Display", "Fraunces", "Josefin_Sans", "Karla", "Nunito_Sans", "Outfit", "Playfair_Display", "Source_Sans_3", "Work_Sans", "Young_Serif"];
  return Object.fromEntries(names.map((name) => [name, font]));
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
