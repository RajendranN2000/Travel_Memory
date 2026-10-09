import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/*
 * Full journey against a real Supabase backend. Enable with E2E_SUPABASE=1.
 * Requirements: migrations applied, email confirmation disabled for the test
 * project (the default for `supabase start`), SUPABASE_SECRET_KEY set so
 * published photos can be signed for visitors.
 */
const enabled = process.env.E2E_SUPABASE === "1";
const PHOTO = path.resolve("tests/e2e/fixtures/photo.jpg");

test.describe.configure({ mode: "serial" });
test.describe("account, editing and publishing", () => {
  test.skip(!enabled, "set E2E_SUPABASE=1 to run against Supabase");
  test.skip(({ isMobile }) => isMobile, "run the full journey once, on desktop");

  const email = `e2e-${Date.now()}@example.test`;
  const password = "correct-horse-battery";
  let editorUrl = "";
  let memoryUrl = "";

  async function signIn(page: Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/my-memories/);
  }

  test("sign up, then sign out and back in", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/my-memories/);
    await expect(page.getByRole("heading", { name: "No memories yet" })).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
    await signIn(page);
  });

  test("create a trip, upload a photo and autosave edits", async ({ page }) => {
    await signIn(page);
    await page.goto("/create?destination=wayanad");
    await page.getByLabel("Title").fill("E2E forest weekend");
    await page.getByLabel("Start date").fill("2025-10-02");
    await page.getByLabel("End date").fill("2025-10-04");
    await page.getByRole("button", { name: "Create draft and add photos" }).click();
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}$/);
    editorUrl = page.url();

    await page.getByRole("tab", { name: /Photos/ }).click();
    await page.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(page.getByRole("button", { name: "Reorder photo 1" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Caption for photo 1").fill("Mist over the canopy");
    await page.getByRole("tab", { name: "Details" }).click();
    await page.getByLabel("Your story").fill("Two days of rain and waterfalls.");
    await expect(page.getByText(/Saved at|All changes saved/)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByLabel("Your story")).toHaveValue("Two days of rain and waterfalls.");
    await page.getByRole("tab", { name: /Photos/ }).click();
    await expect(page.getByLabel("Caption for photo 1")).toHaveValue("Mist over the canopy");
  });

  test("publish unlisted, visible to visitors with the link", async ({ page, browser }) => {
    await signIn(page);
    await page.goto(editorUrl);
    await page.locator("header").getByRole("button", { name: /Publish/ }).click();
    await page.getByLabel(/Unlisted/).check();
    await page.getByRole("dialog").getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByLabel("Link")).toHaveValue(/\/memory\/e2e-forest-weekend-[a-z0-9]{10}$/);
    memoryUrl = await page.getByLabel("Link").inputValue();

    const visitor = await browser.newContext();
    const anon = await visitor.newPage();
    await anon.goto(memoryUrl);
    await expect(anon.getByRole("heading", { level: 1, name: "E2E forest weekend" })).toBeVisible();
    await expect(anon.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(anon.getByAltText(/Mist over the canopy/)).toBeVisible();
    await visitor.close();
  });

  test("private memories are hidden from visitors but open for the owner", async ({ page, browser }) => {
    await signIn(page);
    await page.goto(editorUrl);
    await page.locator("header").getByRole("button", { name: /Publish|Update/ }).click();
    await page.getByLabel(/Private/).check();
    await page.getByRole("button", { name: "Save sharing settings" }).click();
    await expect(page.getByText("Sharing settings updated")).toBeVisible();

    const visitor = await browser.newContext();
    const anon = await visitor.newPage();
    await anon.goto(memoryUrl);
    await expect(anon.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    await visitor.close();

    await page.goto(memoryUrl);
    await expect(page.getByText("This memory is private.")).toBeVisible();
  });

  test("another account cannot open the draft", async ({ browser }) => {
    const other = await browser.newContext();
    const page = await other.newPage();
    await page.goto("/signup");
    await page.getByLabel("Email").fill(`e2e-other-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/my-memories/);
    await page.goto(editorUrl);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    await page.goto(memoryUrl);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    await other.close();
  });
});
