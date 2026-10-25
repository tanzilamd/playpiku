import { test, expect } from "@playwright/test";
import {
  fixtureGames as listedGames,
  fixtureConfig,
} from "./library-fixture.js";
import config from "../src/site-config.js";
async function useLibraryFixture(page) {
  const value = fixtureConfig(config);
  await page.route("**/src/site-config.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export default ${JSON.stringify(value)};`,
    }),
  );
}
async function clock(page) {
  const now = new Date("2026-10-25T12:00:00Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
}
async function open(page, id) {
  await page.goto(`./play/${id}/`);
  await expect(page.locator("#help-done")).toBeVisible();
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
}
async function imageState(page) {
  return page.locator("#game-board canvas").evaluate((c) => c.toDataURL());
}
async function seedBubble(page, state) {
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("bubble-fixture")) {
      localStorage.setItem("playpiku:bubble-save", JSON.stringify(value));
      sessionStorage.setItem("bubble-fixture", "yes");
    }
  }, state);
}

test("Bubble Pop clears a saved garden, awards stars, unlocks the next garden and restores settled progress", async ({
  page,
}) => {
  await seedBubble(page, {
    level: 1,
    board: [
      { row: 0, col: 4, color: 1 },
      { row: 0, col: 5, color: 1 },
    ],
    score: 0,
    shots: 5,
    combo: 0,
    current: 1,
    next: 1,
    status: "playing",
  });
  await clock(page);
  await open(page, "bubble");
  await expect(page.locator("#game-start")).toHaveText("Resume garden");
  await page.locator("#game-start").click();
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await expect(page.locator(".race-result")).toContainText(
    "A lovely little clear",
  );
  await expect(page.locator("#score")).toHaveText("60");
  await expect(page.locator("#shots")).toHaveText("4");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:bubble-progress")),
    ),
  ).toMatchObject({ unlocked: 2 });
  await page.getByRole("button", { name: "Next garden", exact: true }).click();
  await expect(page.locator("#level")).toHaveText("2 / 12");
  await page.locator("#bubble-pause").click();
  const before = await page.locator("#shots").textContent();
  await page.clock.runFor(4000);
  await expect(page.locator("#shots")).toHaveText(before);
  await page.reload();
  await expect(page.locator("#game-start")).toHaveText("Resume garden");
  await expect(page.locator("#level")).toHaveText("2 / 12");
  await expect(page.locator('#bubble-level option[value="2"]')).toBeEnabled();
});
test("Bubble Pop supports aiming, swapping, one shot per gesture, help pause and confirmed restart", async ({
  page,
}) => {
  await clock(page);
  await open(page, "bubble");
  await page.locator("#game-start").click();
  const now = await page.locator("#bubble-current").textContent(),
    next = await page.locator("#bubble-next").textContent();
  await page.locator("#bubble-swap").click();
  await expect(page.locator("#bubble-current")).toHaveText(next);
  await expect(page.locator("#bubble-next")).toHaveText(now);
  await page.locator("#game-board").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#aim-label")).toHaveText("3°");
  const board = page.locator("#game-board");
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  const shots = Number(await page.locator("#shots").textContent());
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.3);
  await page.mouse.up();
  await page.clock.runFor(1400);
  await expect(page.locator("#shots")).toHaveText(String(shots - 1));
  await page.locator("#help-button").click();
  await expect(board).toHaveAttribute("data-state", "paused");
  await page.locator("#help-done").click();
  const frozen = await imageState(page);
  await page.clock.runFor(1500);
  expect(await imageState(page)).toBe(frozen);
  await page.locator("#game-start").click();
  await page.getByRole("button", { name: "Restart game", exact: true }).click();
  await page.getByRole("button", { name: "Keep this game" }).click();
  await expect(page.locator("#shots")).toHaveText(String(shots - 1));
  await page.getByRole("button", { name: "Restart game", exact: true }).click();
  await page.locator("[data-confirm]").click();
  await expect(page.locator("#shots")).toHaveText(String(shots));
  await expect(page.locator("#game-start")).toHaveText("Start popping");
});
test("Bubble Pop has a useful loss and retry instead of accepting extra shots", async ({
  page,
}) => {
  await seedBubble(page, {
    level: 1,
    board: [
      { row: 0, col: 4, color: 1 },
      { row: 0, col: 5, color: 1 },
    ],
    score: 0,
    shots: 1,
    combo: 0,
    current: 2,
    next: 1,
    status: "playing",
  });
  await clock(page);
  await open(page, "bubble");
  await page.locator("#game-start").click();
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await expect(page.locator(".race-result")).toContainText(
    "One more little try",
  );
  await expect(page.locator("#shots")).toHaveText("0");
  await page
    .locator(".race-result")
    .getByRole("button", { name: "Play again", exact: true })
    .click();
  await expect(page.locator("#shots")).toHaveText("35");
  await expect(page.locator("#game-board")).toHaveAttribute(
    "data-state",
    "playing",
  );
});
test("Pinball flippers handle simultaneous touch, keyboard hold, pause, nudges and all three balls", async ({
  page,
}) => {
  test.setTimeout(60000);
  await clock(page);
  await open(page, "pinball");
  await page.locator("#game-start").click();
  await page.locator("#game-board").focus();
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("ArrowRight");
  await expect(page.locator('[data-drive="left"]')).toHaveClass(/pressed/);
  await expect(page.locator('[data-drive="right"]')).toHaveClass(/pressed/);
  await page.clock.runFor(100);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowRight");
  const cdp = await page.context().newCDPSession(page);
  await page.locator(".pinball-flippers").scrollIntoViewIfNeeded();
  const left = await page.locator('[data-drive="left"]').boundingBox(),
    right = await page.locator('[data-drive="right"]').boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: left.x + left.width / 2, y: left.y + left.height / 2 },
      { id: 2, x: right.x + right.width / 2, y: right.y + right.height / 2 },
    ],
  });
  await expect(page.locator(".pinball-flippers .pressed")).toHaveCount(2);
  await page.clock.runFor(200);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".pinball-flippers .pressed")).toHaveCount(0);
  await page.locator("#pinball-nudge").click();
  await expect(page.locator("#pinball-nudge")).toHaveText("Nudge · 2");
  await page.locator("#pinball-pause").click();
  const frozen = await imageState(page);
  await page.clock.runFor(1000);
  expect(await imageState(page)).toBe(frozen);
  await page.locator("#help-button").click();
  await page.locator("#help-done").click();
  await page.locator("#game-start").click();
  for (let ball = 0; ball < 6; ball++) {
    await page.clock.runFor(25000);
    if (await page.locator(".race-result").count()) break;
    if (await page.locator("#game-start").isEnabled())
      await page.locator("#game-start").click();
  }
  await expect(page.locator(".race-result")).toContainText(
    "A bright little run",
  );
  await expect(page.locator("#balls")).toHaveText("0");
  expect(Number(await page.locator("#score").textContent())).toBeGreaterThan(0);
  await page
    .locator(".race-result")
    .getByRole("button", { name: "Play again", exact: true })
    .click();
  await expect(page.locator("#balls")).toHaveText("3");
  await expect(page.locator("#score")).toHaveText("0");
});
test("Meteor auto-fires, supports relative drag and held controls, freezes for help and retries after a full flight", async ({
  page,
}) => {
  test.setTimeout(60000);
  await clock(page);
  await open(page, "meteor");
  await page.locator("#game-start").click();
  const initial = await imageState(page);
  await page.clock.runFor(2000);
  expect(await imageState(page)).not.toBe(initial);
  await page.locator("#game-board").focus();
  await page.keyboard.down("ArrowLeft");
  await page.clock.runFor(300);
  await expect(page.locator('[data-drive="left"]')).toHaveClass(/pressed/);
  await page.keyboard.up("ArrowLeft");
  const board = page.locator("#game-board");
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await page.clock.runFor(400);
  await page.mouse.up();
  await expect(page.locator(".pressed")).toHaveCount(0);
  await page.locator("#help-button").click();
  await expect(board).toHaveAttribute("data-state", "paused");
  await page.locator("#help-done").click();
  const frozen = await imageState(page);
  await page.clock.runFor(1200);
  expect(await imageState(page)).toBe(frozen);
  await page.locator("#game-start").click();
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(15000);
    if (await page.locator(".race-result").count()) break;
  }
  await expect(page.locator(".race-result")).toContainText(
    "A brave little flight",
  );
  expect(Number(await page.locator("#score").textContent())).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Fly again" }).click();
  await expect(page.locator("#health")).toHaveText("♥♥♥");
  await expect(page.locator("#wave")).toHaveText("1");
  await expect(page.locator("#score")).toHaveText("0");
});
test("favorites persist across home, game pages and reloads, and empty favorites stay navigable", async ({
  page,
}) => {
  await useLibraryFixture(page);
  await page.goto("./");
  await page.locator('[data-collection="favorites"]').click();
  await expect(page.locator(".library-empty")).toContainText(
    "Your favorites start here",
  );
  await page
    .getByRole("button", { name: "Browse all games", exact: true })
    .click();
  await page.locator('[data-favorite="bubble"]').click();
  await expect(page.locator('[data-favorite="bubble"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-collection="favorites"]').click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.locator(".game-card .game-art").click();
  await page.locator("#help-done").click();
  await expect(page.locator(".game-favorite")).toHaveText("♥Favorited");
  await page.locator(".game-favorite").click();
  await expect(page.locator(".game-favorite")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator(".game-breadcrumb a").click();
  await expect(page.locator(".library-empty")).toBeVisible();
  await page
    .getByRole("button", { name: "Browse all games", exact: true })
    .click();
  await page.locator('[data-favorite="meteor"]').click();
  await page.reload();
  await expect(page.locator('[data-favorite="meteor"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-collection="favorites"]').click();
  await page.locator('[data-favorite="meteor"]').click();
  await expect(page.locator(".library-empty")).toBeVisible();
  await expect(page.locator('[data-collection="favorites"]')).toBeFocused();
});
test("discovery combines categories, quick picks, search and sort, and clears empty matches", async ({
  page,
}) => {
  await useLibraryFixture(page);
  await page.goto("./");
  await page.locator('[data-quick="quick"]').click();
  await expect(page.locator(".game-card")).toHaveCount(
    listedGames.filter((g) => g.minutes <= 5).length,
  );
  await page.locator('[data-filter="Puzzle"]').click();
  await page.locator('[data-quick="two"]').click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(page.locator(".game-card h3")).toHaveText("Tic Tac Toe");
  await page
    .getByRole("searchbox", { name: "Search games" })
    .fill("no such game");
  await expect(page.locator(".library-empty")).toBeVisible();
  await page.locator("#clear-library").click();
  await expect(page.locator(".game-card")).toHaveCount(listedGames.length);
  await page.locator('[data-quick="relaxing"]').click();
  await expect(page.locator(".game-card")).toHaveCount(
    listedGames.filter((g) => g.mood === "Relaxing").length,
  );
  await page.locator("#clear-library").click();
  await page
    .getByRole("searchbox", { name: "Search games" })
    .fill("  PIKU BUBBLE ");
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.locator("#clear-library").click();
  await page.locator("#game-sort").selectOption("name");
  const names = await page.locator(".game-card h3").allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  await page.locator("#game-sort").selectOption("shortest");
  await expect(page.locator(".game-card h3").first()).toHaveText(
    "Reaction Test",
  );
});
test("one config controls announcement, safe social links, section visibility, metadata and library controls", async ({
  page,
}) => {
  const value = fixtureConfig(config);
  value.announcement = {
    show: true,
    text: 'New <little> games & "good times"',
    linkText: "Explore & play",
    url: "/playpiku/",
  };
  value.socialLinks = [
    {
      label: "Tanzil & friends",
      url: "https://tanzilahmed.tech/?from=playpiku&test=1",
    },
  ];
  value.footerText = "A custom little footer.";
  value.sections = {
    hero: false,
    recent: false,
    breakNote: false,
    relatedGames: false,
  };
  value.library = { search: false, favorites: false, filters: false };
  value.games.find((g) => g.id === "bubble").minutes = 2;
  await page.route("**/src/site-config.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export default ${JSON.stringify(value)}`,
    }),
  );
  await page.goto("./");
  await expect(page.locator(".announcement")).toContainText(
    value.announcement.text,
  );
  await expect(page.locator(".announcement little")).toHaveCount(0);
  await expect(
    page.locator(
      ".hero,.break-note,.resume-banner,[data-favorite],#game-search,[data-filter],[data-quick]",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".social-links a")).toHaveText(
    "Tanzil & friends (opens in a new tab) ↗",
  );
  await expect(page.locator(".social-links a")).toHaveAttribute(
    "href",
    value.socialLinks[0].url,
  );
  await expect(page.locator(".site-footer > p").first()).toHaveText(
    value.footerText,
  );
  await expect(
    page.locator('[data-game="bubble"] .game-attributes'),
  ).toContainText("≈2 min");
  await page.locator('[data-game="bubble"] .game-art').click();
  await page.locator("#help-done").click();
  await expect(page.locator(".more-games,.game-favorite")).toHaveCount(0);
});

test("hidden games leave favorites listings but keep their saved preference and play links", async ({
  page,
}) => {
  const value = fixtureConfig(config);
  value.games.find((g) => g.id === "bubble").show = false;
  await page.route("**/src/site-config.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `export default ${JSON.stringify(value)}`,
    }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "playpiku:favorites",
      JSON.stringify(["bubble", "snake", "snake", "missing"]),
    ),
  );
  await page.goto("./");
  await expect(page.locator("#favorites-count")).toHaveText("1");
  await page.locator('[data-collection="favorites"]').click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(page.locator(".game-card h3")).toHaveText("Snake");
  await page.goto("./play/bubble/");
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
  await expect(page.locator(".game-favorite")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("record reset keeps favorites and Bubble Pop unlocks, and favorites work when storage is blocked", async ({
  page,
}) => {
  await useLibraryFixture(page);
  await page.addInitScript(() => {
    localStorage.setItem("playpiku:best:pinball", "9000");
    localStorage.setItem("playpiku:best:bubble", "600");
    localStorage.setItem("playpiku:favorites", JSON.stringify(["meteor"]));
    localStorage.setItem(
      "playpiku:bubble-progress",
      JSON.stringify({ unlocked: 3, stars: [3, 2] }),
    );
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.locator("#clear-records").click();
  await page.locator("#clear-records").click();
  expect(
    await page.evaluate(() => ({
      best: localStorage.getItem("playpiku:best:pinball"),
      favorites: JSON.parse(localStorage.getItem("playpiku:favorites")),
      progress: JSON.parse(localStorage.getItem("playpiku:bubble-progress")),
    })),
  ).toEqual({
    best: null,
    favorites: ["meteor"],
    progress: { unlocked: 3, stars: [3, 2] },
  });
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.evaluate(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Disabled", "SecurityError");
      },
      configurable: true,
    }),
  );
  await page.locator('[data-favorite="bubble"]').click();
  await expect(page.locator('[data-favorite="bubble"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-collection="favorites"]').click();
  await expect(page.locator('[data-game="bubble"]')).toBeVisible();
});
