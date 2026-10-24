import { test, expect } from "@playwright/test";
import { createWordBoard } from "../src/engines/words.js";
async function open(page, id) {
  await page.goto(`./#/play/${id}`);
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
}
const tap = (el, info) =>
  info.project.name === "mobile" ? el.tap() : el.click();
async function dragBetween(page, from, to, info) {
  if (info.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [from],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [to],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
  }
}
test("Mini Golf completes a hole, pauses a moving ball, saves progress and adds reset penalties", async ({
  page,
}) => {
  await open(page, "golf");
  await page.clock.install();
  await page.locator("#game-start").click();
  await expect(page.locator("#shots")).toHaveText("1");
  await expect(page.locator("#game-start")).toBeDisabled();
  await page.clock.runFor(500);
  await page.getByRole("button", { name: "How to play" }).click();
  const picture = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.clock.runFor(2500);
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).toBe(
    picture,
  );
  await page.locator("#help-done").click();
  await page.locator("#golf-pause").click();
  await page.clock.runFor(6000);
  await expect(page.locator(".board-overlay")).toContainText("hole in one");
  await page.locator(".board-overlay button").click();
  await expect(page.locator("#hole")).toHaveText("2 / 6");
  await page.reload();
  await expect(page.locator("#hole")).toHaveText("2 / 6");
  await expect(page.locator("#total")).toHaveText("1");
  await page.locator("#golf-power").focus();
  await page.keyboard.press("Home");
  await page.locator("#golf-angle").focus();
  await page.keyboard.press("Home");
  await page.locator("#game-start").click();
  await page.clock.runFor(5000);
  await expect(page.locator("#game-start")).toBeEnabled();
  await page.locator("#reset-ball").click();
  await expect(page.locator("#shots")).toHaveText("2");
  await expect(page.locator("#total")).toHaveText("3");
});
test("Mini Golf drag controls take a shot and finish a restored six-hole round", async ({
  page,
}, info) => {
  await open(page, "golf");
  await page.clock.install();
  await page.locator("#game-board").scrollIntoViewIfNeeded();
  const box = await page.locator("canvas").boundingBox();
  const from = {
      x: box.x + (90 / 480) * box.width,
      y: box.y + (260 / 360) * box.height,
    },
    to = {
      x: box.x + (10 / 480) * box.width,
      y: box.y + (303 / 360) * box.height,
    };
  await dragBetween(page, from, to, info);
  await expect(page.locator("#shots")).toHaveText("1");
  await page.clock.runFor(6000);
  await expect(page.locator("#game-start")).toBeEnabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("playpiku:golf-save")),
  );
  expect(saved.ball.x).not.toBe(90);
  await page.evaluate(() =>
    localStorage.setItem(
      "playpiku:golf-save",
      JSON.stringify({
        index: 5,
        scores: [1, 2, 3, 4, 2],
        strokes: 0,
        ball: { x: 360, y: 270 },
      }),
    ),
  );
  await page.reload();
  await expect(page.locator("#hole")).toHaveText("6 / 6");
  await page.locator("#game-start").click();
  await page.clock.runFor(3000);
  await expect(page.locator(".board-overlay")).toContainText("13 shots");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:best:golf")),
    ),
  ).toBe(13);
  await page.locator(".board-overlay button").click();
  await expect(page.locator("#hole")).toHaveText("1 / 6");
  await expect(page.locator("#shots")).toHaveText("0");
});
test("Word Hunt supports endpoint selection, hints, pause and a complete saved best time", async ({
  page,
}, info) => {
  await page.addInitScript(() => (Math.random = () => 0.25));
  await open(page, "words");
  await page.clock.install();
  await page.locator("#game-start").click();
  await tap(page.locator('[data-letter="0"]'), info);
  await tap(page.locator('[data-letter="17"]'), info);
  await expect(page.locator(".game-feedback")).toContainText("straight line");
  await expect(page.locator("#clear-word")).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.locator(".selecting")).toHaveCount(0);
  await page.locator("#word-hint").click();
  await expect(page.locator("#word-hint")).toBeDisabled();
  await page.locator("#word-hint").evaluate((button) => button.click());
  await expect(page.locator(".word-hint")).toHaveCount(1);
  await expect(page.locator("#hint-penalty")).toContainText("+30s");
  await page.clock.runFor(1200);
  await page.getByRole("button", { name: "How to play" }).click();
  const time = await page.locator("#time").textContent();
  await page.clock.runFor(3000);
  await page.locator("#help-done").click();
  await expect(page.locator("#time")).toHaveText(time);
  await page.locator("#game-start").click();
  const puzzle = createWordBoard("nature", "easy", () => 0.25);
  for (const word of puzzle.words) {
    const path = puzzle.placements[word];
    await tap(page.locator(`[data-letter="${path[0]}"]`), info);
    await tap(page.locator(`[data-letter="${path.at(-1)}"]`), info);
  }
  await expect(page.locator("#found")).toHaveText("6 / 6");
  await expect(page.locator(".word-list .found")).toHaveCount(6);
  await expect(page.locator(".board-overlay")).toContainText("Final time");
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("playpiku:best:words-easy")),
  );
  expect(record).toBeGreaterThanOrEqual(30);
  const best = await page.locator("#best").textContent();
  await page.reload();
  await expect(page.locator("#best")).toHaveText(best);
});
test("Word Hunt drag and keyboard controls work on a Classic topic without duplicate scoring", async ({
  page,
}, info) => {
  await page.addInitScript(() => (Math.random = () => 0.25));
  await open(page, "words");
  await page.locator("#word-theme").selectOption("food");
  await page.locator("#word-mode").selectOption("classic");
  await page.locator("#game-start").click();
  const puzzle = createWordBoard("food", "classic", () => 0.25),
    path = puzzle.placements[puzzle.words[0]];
  await page.locator(".word-grid").scrollIntoViewIfNeeded();
  const a = await page.locator(`[data-letter="${path[0]}"]`).boundingBox(),
    b = await page.locator(`[data-letter="${path.at(-1)}"]`).boundingBox();
  await dragBetween(
    page,
    { x: a.x + a.width / 2, y: a.y + a.height / 2 },
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    info,
  );
  await expect(page.locator("#found")).toHaveText("1 / 8");
  await page.locator(`[data-letter="${path.at(-1)}"]`).focus();
  await page.keyboard.press("Enter");
  await page.locator(`[data-letter="${path[0]}"]`).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#found")).toHaveText("1 / 8");
  const next = puzzle.placements[puzzle.words[1]];
  await page.locator(`[data-letter="${next[0]}"]`).focus();
  await page.keyboard.press("Enter");
  await page.locator(`[data-letter="${next.at(-1)}"]`).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#found")).toHaveText("2 / 8");
  await expect(page.locator(".word-list .found")).toHaveCount(2);
});
test("Piku Stack perfect drops, pause, trimming, game over and best records work", async ({
  page,
}, info) => {
  await open(page, "stack");
  await page.clock.install();
  await page.locator("#game-start").click();
  await page.clock.runFor(1300);
  await tap(page.locator("#game-board"), info);
  await expect(page.locator("#height")).toHaveText("1");
  await expect(page.locator("#streak")).toHaveText("1");
  await page.getByRole("button", { name: "How to play" }).click();
  const picture = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.clock.runFor(2000);
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).toBe(
    picture,
  );
  await page.locator("#help-done").click();
  await page.locator("#game-start").click();
  await page.locator("#game-start").click();
  await expect(page.locator("#height")).toHaveText("2");
  await expect(page.locator("#streak")).toHaveText("0");
  await page.locator("#game-start").click();
  await expect(page.locator(".board-overlay")).toContainText("2 floors");
  await page.locator("#stack-mode").selectOption("classic");
  await expect(page.locator("#best")).toHaveText("0");
  await page.locator("#stack-mode").selectOption("relaxed");
  await expect(page.locator("#best")).toHaveText("2");
  await page.reload();
  await expect(page.locator("#best")).toHaveText("2");
});
test("Piku Stack keeps a growing tower playable across camera movement", async ({
  page,
}) => {
  await open(page, "stack");
  await page.clock.install();
  await page.locator("#game-start").click();
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(
      Math.round((110 / Math.min(170, 85 + i * 6)) * 1000),
    );
    await page.keyboard.press("Space");
    await expect(page.locator("#height")).toHaveText(String(i + 1));
  }
  await expect(page.locator("#streak")).toHaveText("12");
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await page.keyboard.press("p");
  await expect(page.locator(".board-overlay")).toContainText("paused");
});
test("new game records reset without losing a saved golf round", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    for (const key of [
      "golf",
      "words-easy",
      "words-classic",
      "stack-relaxed",
      "stack-classic",
    ])
      localStorage.setItem("playpiku:best:" + key, "20");
    localStorage.setItem(
      "playpiku:golf-save",
      JSON.stringify({
        index: 1,
        scores: [2],
        strokes: 0,
        ball: { x: 80, y: 270 },
      }),
    );
  });
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.locator("#clear-records").click();
  await page.locator("#clear-records").click();
  expect(
    await page.evaluate(() =>
      [
        "golf",
        "words-easy",
        "words-classic",
        "stack-relaxed",
        "stack-classic",
      ].map((key) => localStorage.getItem("playpiku:best:" + key)),
    ),
  ).toEqual([null, null, null, null, null]);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("playpiku:golf-save")).index,
    ),
  ).toBe(1);
});
