import { test, expect } from "@playwright/test";
import { games, listedGames } from "../src/catalog.js";
import { SITE_URL, SHARE_VERSION, socialMetadata } from "../src/site.js";
function metadata(html) {
  return Object.fromEntries(
    [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => {
      const key = /(?:property|name)="([^"]+)"/.exec(tag),
        value = /content="([^"]*)"/.exec(tag);
      return key && value
        ? [
            key[1],
            value[1].replace(
              /&(amp|lt|gt|quot|#39);/g,
              (_, key) =>
                ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[key],
            ),
          ]
        : ["", ""];
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
  const chosen = listedGames[0] || games[0];
  if (listedGames.length)
    await page.locator(".game-card .game-art").first().click();
  else await page.goto(`./play/${chosen.id}/`);
  await page.locator("#help-done").click();
  await expect(page).toHaveURL(new RegExp(`/playpiku/play/${chosen.id}/$`));
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    `${chosen.name} — PlayPiku`,
  );
  await page.reload();
  await expect(page.locator("#game-board")).toBeVisible();
  await page.getByRole("link", { name: "PlayPiku home" }).click();
  await expect(page).toHaveURL(/\/playpiku\/$/);
  await expect(page.locator(".game-card")).toHaveCount(listedGames.length);
  await page.goBack();
  await expect(page.locator("h1")).toHaveText(`${chosen.name}.`);
  await page.goto("./#/play/golf");
  await expect(page).toHaveURL(/\/playpiku\/play\/golf\/$/);
  await page.locator("#game-board").waitFor();
  if (await page.locator("#help-done").isVisible())
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
    expect(tags["og:image"]).toContain(`playpiku-share-${SHARE_VERSION}.png`);
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
      new URL(
        new URL(socialMetadata(game).image).pathname +
          new URL(socialMetadata(game).image).search,
        baseURL,
      ).href,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }
});
