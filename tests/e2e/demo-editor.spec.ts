import path from "node:path";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, supabaseConfigured } from "./helpers";

const PHOTO = path.resolve("tests/e2e/fixtures/photo.jpg");

test.describe("demo editor (development without Supabase)", () => {
  test.skip(supabaseConfigured, "demo mode is only available when Supabase is not configured");

  test("is clearly labelled and never claims to save", async ({ page }) => {
    await page.goto("/editor/demo");
    await expect(page.getByText(/Demo mode with sample data. Nothing is saved/)).toBeVisible();
    await expect(page.getByText("Demo · not saved")).toBeVisible();
    await page.locator("header").getByRole("button", { name: /Publish/ }).click();
    await expect(page.getByText(/Publishing is disabled in demo mode/)).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
  });

  test("adds, reorders and removes photos and restyles the preview", async ({ page, isMobile }) => {
    await page.goto("/editor/demo");
    await page.getByRole("tab", { name: /Photos/ }).click();
    const list = page.locator("ol").filter({ has: page.getByRole("button", { name: /Reorder photo 1/ }) });
    await expect(list.locator(":scope > li")).toHaveCount(4);

    await page.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(list.locator(":scope > li")).toHaveCount(5, { timeout: 20_000 });

    const firstCaption = page.getByLabel("Caption for photo 1");
    const original = await firstCaption.inputValue();
    await page.getByRole("button", { name: "Move photo 1 down" }).click();
    await expect(page.getByLabel("Caption for photo 2")).toHaveValue(original);

    await page.getByRole("button", { name: "Delete photo 5" }).click();
    await page.getByRole("button", { name: "Delete photo" }).click();
    await expect(list.locator(":scope > li")).toHaveCount(4);

    await page.getByRole("tab", { name: "Design" }).click();
    await page.getByRole("button", { name: /Day by Day/ }).click();
    await page.getByRole("button", { name: "Manali" }).click();
    if (isMobile) await page.getByRole("tab", { name: "Preview" }).click();
    const preview = page.getByRole("region", { name: "Memory preview" }).first();
    await expect(preview.locator("[data-destination='manali']")).toBeAttached();
    await expect(preview.getByText("Up the valley")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("rejects unsupported files with a helpful message", async ({ page }) => {
    await page.goto("/editor/demo");
    await page.getByRole("tab", { name: /Photos/ }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByText(/only JPEG, PNG and WebP images/)).toBeVisible();
  });
});
