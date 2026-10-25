import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { games } from "../src/catalog.js";
import { METEOR_GUARDIANS } from "../src/engines/meteor.js";
import { buildable } from "../src/engines/defense.js";
async function open(page, id) {
  await page.goto(`./play/${id}/`);
  await expect(page.locator("#game-board")).toBeVisible();
  if (await page.locator("#help-done").isVisible())
    await page.locator("#help-done").click();
}
async function clock(page) {
  const now = new Date("2026-10-25T12:00:00Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.valueOf() + 60000));
}

test("every game enters and leaves Focus mode, keeps its board, and has usable controls at different sizes", async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const sizes =
    info.project.name === "mobile"
      ? [
          [390, 844],
          [667, 375],
        ]
      : [
          [1440, 1000],
          [768, 1024],
        ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const game of games) {
      await open(page, game.id);
      await page.evaluate(
        () =>
          (window.existingGameBoard = document.querySelector("#game-board")),
      );
      await page.locator("#focus-button").click();
      await expect(page.locator("html")).toHaveClass(/focus-mode/);
      await expect(page.locator(".site-header")).toBeHidden();
      await expect(page.locator(".site-footer")).toBeHidden();
      await expect(page.locator(".game-aside")).toBeHidden();
      await expect(page.locator("#focus-exit")).toBeVisible();
      await expect(page.locator("#game-board")).toBeVisible();
      const issues = await page.evaluate(() => {
        const result = [],
          panel = document.querySelector("#play-panel").getBoundingClientRect(),
          w = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > w + 1)
          result.push("page overflow");
        for (const el of document.querySelectorAll(
          ".game-controls .button,.focus-toolbar button,.game-toolbar",
        )) {
          if (!el.getClientRects().length) continue;
          const r = el.getBoundingClientRect();
          if (r.left < 0 || r.right > w + 1)
            result.push("control outside viewport");
        }
        if (panel.left < 0 || panel.right > w + 1)
          result.push("panel overflow");
        return result;
      });
      expect(issues, `${game.id} focus at ${width}×${height}`).toEqual([]);
      await page.locator("#focus-help").click();
      await expect(page.locator("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog")).toBeHidden();
      await expect(page.locator("html")).toHaveClass(/focus-mode/);
      await page.locator("#focus-exit").click();
      await expect(page.locator("html")).not.toHaveClass(/focus-mode/);
      expect(
        await page.evaluate(
          () =>
            window.existingGameBoard === document.querySelector("#game-board"),
        ),
      ).toBe(true);
      await expect(page.locator("#focus-button")).toBeFocused();
    }
  }
  expect(errors).toEqual([]);
});
test("Focus and native fullscreen pause a running game, keep help usable, and restore the regular view", async ({
  page,
}) => {
  await clock(page);
  await open(page, "pinball");
  await page.locator("#game-start").click();
  await page.clock.runFor(400);
  await page.locator("#focus-button").click();
  await expect(page.locator("#game-board")).toHaveAttribute(
    "data-state",
    "paused",
  );
  const image = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.clock.runFor(1200);
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).toBe(
    image,
  );
  const native = await page.evaluate(
    () =>
      !!(
        document.fullscreenEnabled && document.documentElement.requestFullscreen
      ),
  );
  if (native) {
    await page.locator("#focus-fullscreen").click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true);
    await page.locator("#focus-help").click();
    await expect(page.locator("dialog")).toBeVisible();
    await page.locator("#help-done").click();
    await page.locator("#focus-fullscreen").click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(false);
    await expect(page.locator("html")).toHaveClass(/focus-mode/);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).not.toHaveClass(/focus-mode/);
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await page.locator("#game-start").click();
  await expect(page.locator("#game-board")).toHaveAttribute(
    "data-state",
    "playing",
  );
});
test("Focus works without fullscreen, handles a rejected fullscreen request, and clears on browser Back", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenEnabled", {
      get: () => !sessionStorage.getItem("fullscreen-unavailable"),
      configurable: true,
    });
    Element.prototype.requestFullscreen = async () => {
      throw new Error("Not available");
    };
  });
  await page.goto("./");
  await page.goto("./play/snake/");
  await page.locator("#help-done").click();
  await page.locator("#focus-button").click();
  await page.locator("#focus-fullscreen").click();
  await expect(page.locator("#toast")).toContainText(
    "keep playing in Focus mode",
  );
  await expect(page.locator("html")).toHaveClass(/focus-mode/);
  await page.goBack();
  await expect(page.locator("html")).not.toHaveClass(/focus-mode/);
  await expect(page.locator(".game-grid")).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem("fullscreen-unavailable", "yes"),
  );
  await page.goto("./play/snake/");
  await page.locator("#focus-button").click();
  await expect(page.locator("#focus-fullscreen")).toBeHidden();
  await expect(page.locator("#game-board")).toBeVisible();
  await page.locator("#focus-exit").click();
});
test("old Bubble Pop progress unlocks the new chapter and new gardens save and resume", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("bubble-chapter")) return;
    sessionStorage.setItem("bubble-chapter", "yes");
    localStorage.setItem(
      "playpiku:bubble-progress",
      JSON.stringify({ unlocked: 12, stars: [3, 2, ...Array(9).fill(0), 3] }),
    );
    localStorage.setItem(
      "playpiku:bubble-save",
      JSON.stringify({
        level: 12,
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
      }),
    );
  });
  await clock(page);
  await open(page, "bubble");
  await expect(page.locator('#bubble-level option[value="13"]')).toBeEnabled();
  await page.locator("#game-start").click();
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await page.getByRole("button", { name: "Next garden", exact: true }).click();
  await expect(page.locator("#level")).toHaveText("13 / 24");
  await expect(page.locator("#bubble-level option")).toHaveCount(24);
  await page.locator("#bubble-pause").click();
  await page.reload();
  await expect(page.locator("#level")).toHaveText("13 / 24");
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("playpiku:bubble-progress")),
  );
  expect(progress.unlocked).toBe(13);
  expect(progress.stars.slice(0, 2)).toEqual([3, 2]);
  expect(progress.stars).toHaveLength(24);
});
test("Woodland course keeps its own round and record while retaining legacy Meadow progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("golf-courses")) return;
    sessionStorage.setItem("golf-courses", "yes");
    localStorage.setItem(
      "playpiku:golf-save",
      JSON.stringify({
        index: 2,
        scores: [1, 2],
        strokes: 1,
        ball: { x: 75, y: 180 },
      }),
    );
    localStorage.setItem("playpiku:best:golf", "13");
  });
  await clock(page);
  await open(page, "golf");
  await expect(page.locator("#hole")).toHaveText("3 / 6");
  await page.locator("#golf-course").selectOption("woodland");
  await expect(page.locator("#hole")).toHaveText("1 / 6");
  await page.locator("#golf-power").fill("5");
  await page.locator("#game-start").click();
  await page.locator("#golf-course").selectOption("meadow");
  await expect(page.locator("#golf-course")).toHaveValue("woodland");
  await expect(page.locator("#toast")).toContainText("Let the ball stop");
  await page.clock.runFor(6000);
  await page.locator("#golf-course").selectOption("meadow");
  await expect(page.locator("#hole")).toHaveText("3 / 6");
  await expect(page.locator("#shots")).toHaveText("1");
  await page.locator("#golf-course").selectOption("woodland");
  await expect(page.locator("#shots")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#golf-course")).toHaveValue("woodland");
  await expect(page.locator("#shots")).toHaveText("1");
  await page.evaluate(() =>
    localStorage.setItem(
      "playpiku:golf-save:woodland",
      JSON.stringify({
        courseId: "woodland",
        index: 5,
        scores: [2, 4, 3, 4, 1],
        strokes: 0,
        ball: { x: 390, y: 120 },
      }),
    ),
  );
  await page.reload();
  await page.locator("#game-start").click();
  await page.clock.runFor(3000);
  await expect(page.locator(".board-overlay")).toContainText("15 shots");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:best:golf-woodland")),
    ),
  ).toBe(15);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:best:golf")),
    ),
  ).toBe(13);
});
test("new defense maps support building, blocked map changes, restart and a paused wave", async ({
  page,
}) => {
  await clock(page);
  await open(page, "defense");
  await expect(page.locator("#defense-map option")).toHaveCount(4);
  for (const id of ["orchard", "ridge"]) {
    await page.locator("#defense-map").selectOption(id);
    const cell = Array.from({ length: 96 }, (_, i) => i).find((i) =>
      buildable(id, i),
    );
    await page.locator(`[data-defense-cell="${cell}"]`).click();
    await page.locator("#build-tower").click();
    await page.locator("#defense-map").selectOption("meadow");
    await expect(page.locator("#defense-map")).toHaveValue(id);
    await page.locator("#game-start").click();
    await page.clock.runFor(1000);
    await page.locator("#defense-pause").click();
    await expect(page.locator("#defense-pause")).toHaveText("Resume");
    await page
      .getByRole("button", { name: "Restart game", exact: true })
      .click();
    await page.locator("[data-confirm]").click();
    await expect(page.locator("#wave")).toHaveText("0 / 10");
  }
});
test("each Meteor guardian renders its name, distinct appearance and focus-safe paused flight", async ({
  page,
}) => {
  const source = await readFile(
    new URL("../src/engines/meteor.js", import.meta.url),
    "utf8",
  );
  let wave = 3;
  await page.route("**/src/engines/meteor.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: source.replace(
        "export function newMeteor() {",
        `export function newMeteor() {const state=baseMeteor();state.wave=${wave};state.spawned=8;return state;} function baseMeteor() {`,
      ),
    }),
  );
  await clock(page);
  const pictures = [];
  for (let i = 0; i < 3; i++) {
    wave = (i + 1) * 3;
    await open(page, "meteor");
    await page.locator("#game-start").click();
    await page.clock.runFor(2800);
    await expect(page.locator(".game-feedback")).toContainText(
      METEOR_GUARDIANS[i].name,
    );
    pictures.push(await page.locator("canvas").evaluate((c) => c.toDataURL()));
    await page.locator("#focus-button").click();
    await expect(page.locator("#game-board")).toHaveAttribute(
      "data-state",
      "paused",
    );
    await page.locator("#focus-exit").click();
  }
  expect(new Set(pictures).size).toBe(3);
});

test("Focus pauses a golf shot and gives keyboard players a focused Resume action", async ({
  page,
}) => {
  await clock(page);
  await open(page, "golf");
  await page.locator("#game-start").click();
  await page.clock.runFor(300);
  await page.locator("#focus-button").click();
  await expect(page.locator(".board-overlay button")).toBeFocused();
  await expect(page.locator(".board-overlay")).toContainText("paused");
  await page.keyboard.press("Space");
  await page.clock.runFor(6000);
  await expect(page.locator(".board-overlay")).toContainText("hole in one");
  await page.locator("#focus-exit").click();
  await expect(page.locator("#shots")).toHaveText("1");
});
