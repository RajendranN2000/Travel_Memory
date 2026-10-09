import { expect, test } from "@playwright/test";
import { expectImagesHaveAlt, expectNoHorizontalOverflow, supabaseConfigured } from "./helpers";

test.describe("public pages", () => {
  test("landing page tells the story and leads to creation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Your trips deserve more than a camera roll." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create your memory/ }).first()).toBeVisible();
    for (const section of ["Every place has its own look", "Four ways to tell the story", "From camera roll to keepsake in four steps", "Your memories, on your terms"]) {
      await expect(page.getByRole("heading", { name: section })).toBeAttached();
    }
    await expectNoHorizontalOverflow(page);
    await expectImagesHaveAlt(page);
  });

  test("skip link moves focus to the main content", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("destination pages carry a complete theme", async ({ page }) => {
    await page.goto("/destinations");
    await page.getByRole("main").getByRole("link", { name: /Goa/ }).click();
    await expect(page).toHaveURL(/\/destinations\/goa$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Goa" })).toBeVisible();
    await expect(page.getByText("Sunset Shack")).toBeVisible();
    const primary = await page.locator("[style*='--t-primary']").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--t-primary").trim());
    expect(primary).toBe("#b8481f");
    await expectNoHorizontalOverflow(page);
  });

  test("unknown destinations show the not-found page", async ({ page }) => {
    await page.goto("/destinations/atlantis");
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  });

  test("template preview switches theme, layout and empty state", async ({ page }) => {
    await page.goto("/templates/day-by-day?destination=manali");
    const preview = page.getByRole("region", { name: "Day by Day preview" });
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(/Snowlines and river songs/i);
    await page.getByRole("button", { name: "Wayanad" }).click();
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(/Waterfalls, pepper vines/);
    await page.getByRole("button", { name: /Alternating/ }).click();
    await expect(page.getByRole("button", { name: /Alternating/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Preview with no photos").click();
    await expect(preview.getByText(/Add a few forest photos/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Use this template/ })).toHaveAttribute("href", /template=day-by-day&destination=wayanad&layout=alternating/);
  });

  test("sample memory is published, labelled and not indexable", async ({ page }) => {
    await page.goto("/memory/sample-goa");
    await expect(page.getByRole("heading", { level: 1, name: /Salt, sun and the slowest week/ })).toBeVisible();
    await expect(page.getByText(/Sample memory made with licensed destination photography/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoHorizontalOverflow(page);
    await expectImagesHaveAlt(page);
  });

  test("unknown memories return the not-found page", async ({ page }) => {
    const response = await page.goto("/memory/does-not-exist-abc123");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  });

  test("legal pages are clearly marked as drafts", async ({ page }) => {
    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      await expect(page.getByText("Draft for review.")).toBeVisible();
    }
  });

  test("protected routes are not reachable signed out", async ({ page }) => {
    for (const path of ["/my-memories", "/create", "/settings", "/editor/11111111-1111-4111-8111-111111111111"]) {
      await page.goto(path);
      await expect(page).toHaveURL(supabaseConfigured ? /\/login\?next=/ : /\/setup$/);
    }
  });

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    const memory = await request.get("/memory/sample-goa");
    expect(memory.headers()["referrer-policy"]).toBe("no-referrer");
  });
});
