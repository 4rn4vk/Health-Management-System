import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login form shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Invalid email")).toBeVisible();
  });
});

test.describe("Admin CRUD flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@hcms.local");
    await page.fill('input[type="password"]', "admin_password");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("admin can navigate to Providers page", async ({ page }) => {
    await page.click("text=Providers");
    await expect(page).toHaveURL(/\/providers/);
    await expect(page.locator("h2", { hasText: "Provider Directory" })).toBeVisible();
  });

  test("admin can navigate to Upload page", async ({ page }) => {
    await page.click("text=Upload CSV");
    await expect(page).toHaveURL(/\/upload/);
    await expect(page.locator("text=Drop a CSV file")).toBeVisible();
  });

  test("upload page rejects non-csv file client-side", async ({ page }) => {
    await page.goto("/upload");
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await expect(page.locator("text=Only .csv files")).toBeVisible();
  });
});

test.describe("Viewer restrictions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "viewer@hcms.local");
    await page.fill('input[type="password"]', "viewer_password");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("viewer does not see Upload CSV nav link", async ({ page }) => {
    await expect(page.locator("text=Upload CSV")).not.toBeVisible();
  });

  test("viewer is redirected away from /upload", async ({ page }) => {
    await page.goto("/upload");
    await expect(page).not.toHaveURL(/\/upload/);
  });
});
