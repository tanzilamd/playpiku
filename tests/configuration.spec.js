import { test, expect } from "@playwright/test";
import config from "../src/site-config.js";
async function override(page, value) {
  value = {
    ...value,
    sections: { hero: true, recent: true, breakNote: true, relatedGames: true },
    library: { favorites: true, filters: true },
  };
  await page.route("**/src/site-config.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export default ${JSON.stringify(value)};`,
    }),
  );
}
test("a single config edit changes the homepage, order, categories, text, featured fallback, accent and credit", async ({
  page,
}) => {
  const value = structuredClone(config);
  value.games = [
    {
      id: "traffic",
      show: true,
      isNew: false,
      name: `Racers' <Club> & Friends`,
      description: 'Make a <match> & "keep" going.',
      category: "Racing & Rides",
    },
    { id: "snake", show: true, isNew: true },
    { id: "harvest", show: false },
  ];
  value.featuredGame = "harvest";
  value.homepage.titleFirst = "Games & good times for every little break.";
  value.homepage.titleSecond = "Your <little> break.";
  value.accentColor = "#ffaa88";
  value.developer = {
    name: "Tanzil & Friends",
    url: "https://tanzilahmed.tech/?from=arcade&test=1",
  };
  await override(page, value);
  await page.addInitScript(() =>
    localStorage.setItem("playpiku:recent", '"harvest"'),
  );
  await page.goto("./");
  await expect(page.locator(".game-card")).toHaveCount(2);
  await expect(page.locator(".hero h1")).toContainText("Your <little> break.");
  await expect(page.locator(".hero-feature")).toHaveAttribute(
    "href",
    "/playpiku/play/traffic/",
  );
  await expect(page.locator(".game-card h3").first()).toHaveText(
    value.games[0].name,
  );
  await expect(page.locator(".game-card p").first()).toHaveText(
    value.games[0].description,
  );
  await expect(
    page.locator(".game-card").first().locator(".new-game"),
  ).toHaveCount(0);
  await expect(
    page.locator(".game-card").last().locator(".new-game"),
  ).toHaveCount(1);
  await expect(page.locator(".resume-banner")).toHaveCount(0);
  await expect(page.locator(".hero h1 little")).toHaveCount(0);
  await expect(page.locator("[data-developer-name]")).toHaveText(
    value.developer.name,
  );
  await expect(page.locator("[data-developer-link]")).toHaveAttribute(
    "href",
    value.developer.url,
  );
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--lime")
        .trim(),
    ),
  ).toBe("#ffaa88");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open settings" }).click();
  expect(
    await page.locator("dialog").evaluate((d) => {
      const r = d.getBoundingClientRect();
      return r.left >= 0 && r.right <= document.documentElement.clientWidth + 1;
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "Close settings" }).click();
  await page
    .getByRole("button", { name: "Racing & Rides", exact: true })
    .click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.locator(".game-card .game-art").click();
  await page.locator("#help-done").click();
  await expect(page.locator("h1")).toHaveText(value.games[0].name + ".");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    value.games[0].name + " — PlayPiku",
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    value.games[0].description,
  );
  await page.goto("./play/harvest/");
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
  await expect(
    page.locator('.related-links a[href="/playpiku/play/harvest/"]'),
  ).toHaveCount(0);
});
test("an empty listing shows a useful message and still allows existing game links", async ({
  page,
}) => {
  const value = structuredClone(config);
  value.games = [];
  await override(page, value);
  await page.goto("./");
  await expect(page.locator(".library-empty")).toContainText("Check back soon");
  await expect(page.locator(".game-card")).toHaveCount(0);
  await expect(page.locator(".hero-feature")).toHaveCount(0);
  await expect(page.locator(".game-count")).toContainText("0 games");
  await expect(page.locator("[data-filter]")).toHaveCount(1);
  await page.goto("./play/snake/");
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
});
