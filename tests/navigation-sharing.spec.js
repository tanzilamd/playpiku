import { test, expect } from "@playwright/test";
import { games } from "../src/catalog.js";
import { SITE_URL } from "../src/site.js";
function metadata(html) {
  return Object.fromEntries(
    [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => {
      const key = /(?:property|name)="([^"]+)"/.exec(tag),
        value = /content="([^"]*)"/.exec(tag);
      return key && value ? [key[1], value[1]] : ["", ""];
    }),
  );
}
test("logo, clean URLs, legacy links, reloads and back navigation work without home fragments", async ({
  page,
}) => {
  await page.goto("./#/");
  await expect(page).toHaveURL(/\/playpiku\/$/);
  await expect(page.locator(".brand")).toHaveAttribute("href", "/playpiku/");
  await expect(page.locator(".footer-logo")).toHaveAttribute(
    "href",
    "/playpiku/",
  );
  await page
    .getByRole("link", { name: "Play Piku Rally", exact: true })
    .first()
    .click();
  await page.locator("#help-done").click();
  await expect(page).toHaveURL(/\/playpiku\/play\/rally\/$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Piku Rally — PlayPiku",
  );
  await page.reload();
  await expect(page.locator("#game-board")).toBeVisible();
  await page.getByRole("link", { name: "PlayPiku home" }).click();
  await expect(page).toHaveURL(/\/playpiku\/$/);
  await expect(page.locator(".game-card")).toHaveCount(17);
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("Piku Rally.");
  await page.goto("./#/play/golf");
  await expect(page).toHaveURL(/\/playpiku\/play\/golf\/$/);
  await page.locator("#help-done").click();
  await page.getByRole("link", { name: "All games", exact: false }).click();
  await expect(page).toHaveURL(/\/playpiku\/$/);
});
test("Share game copies the clean public URL with game metadata", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (value) => (window.copiedGameLink = value) },
      configurable: true,
    });
  });
  await page.goto("./play/defense/");
  await page.locator("#help-done").click();
  await page.getByRole("button", { name: "Share game" }).click();
  expect(await page.evaluate(() => window.copiedGameLink)).toBe(
    SITE_URL + "play/defense/",
  );
  await expect(page.locator("#toast")).toContainText("link copied");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    SITE_URL + "play/defense/",
  );
});
test("home variants and every game expose preview metadata and PNGs to crawlers without JavaScript", async ({
  request,
  baseURL,
}) => {
  test.setTimeout(120000);
  for (const path of ["./", "./#/", "./?share=1"]) {
    const response = await request.get(path, {
      headers: { "User-Agent": "WhatsApp/2.24" },
    });
    expect(response.status()).toBe(200);
    const tags = metadata(await response.text());
    expect(tags["og:url"]).toBe(SITE_URL);
    expect(tags["og:image"]).toContain("playpiku-share-v3.png");
  }
  for (const game of games) {
    for (const agent of [
      "facebookexternalhit/1.1",
      "WhatsApp/2.24",
      "Twitterbot/1.0",
    ]) {
      const response = await request.get(`./play/${game.id}/`, {
        headers: { "User-Agent": agent },
      });
      expect(response.status(), `${agent} ${game.id}`).toBe(200);
      const html = await response.text(),
        tags = metadata(html);
      expect(tags["og:url"]).toBe(SITE_URL + "play/" + game.id + "/");
      expect(tags["og:title"]).toBe(game.name + " — PlayPiku");
      expect(tags["twitter:image"]).toBe(tags["og:image"]);
      expect(html).toContain('<base href="/playpiku/"');
    }
    const response = await request.get(
      new URL(`/playpiku/assets/share-${game.id}-v3.png`, baseURL).href,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }
});
