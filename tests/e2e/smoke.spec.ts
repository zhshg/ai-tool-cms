import { test, expect } from "@playwright/test";

test.describe("production smoke @e2e", () => {
  test("web homepage loads", async ({ page }) => {
    await page.goto(process.env.WEB_URL ?? "http://localhost:3000/en");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("api liveness", async ({ request }) => {
    const base = process.env.API_URL ?? "http://localhost:4000";
    const res = await request.get(`${base}/v1/health/live`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("alive");
  });
});
