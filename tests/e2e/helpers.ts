import { expect, type Page } from "@playwright/test";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

/** Fails if the page scrolls horizontally (a common mobile layout bug). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
}

/** Every <img> must declare alt text (empty alt is fine for decorative images). */
export async function expectImagesHaveAlt(page: Page) {
  const missing = await page.locator("img:not([alt])").count();
  expect(missing, "images without an alt attribute").toBe(0);
}
