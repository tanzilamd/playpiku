import { test, expect } from "@playwright/test";
import {
  createMinefield,
  revealMines,
  neighbors,
} from "../src/engines/mines.js";
async function open(page, id) {
  await page.goto(`./#/play/${id}`);
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
}
async function blockSave(page, save) {
  await page.evaluate(
    (value) =>
      localStorage.setItem("playpiku:blocks-save", JSON.stringify(value)),
    save,
  );
  await page.reload();
  await expect(page.locator(".block-cell")).toHaveCount(64);
}
const tap = async (locator, info) =>
  info.project.name === "mobile" ? locator.tap() : locator.click();
test("Block Puzzle clears intersections, rejects illegal placement, refills and restores progress", async ({
  page,
}, info) => {
  await open(page, "blocks");
  const board = Array(64).fill(0);
  for (let i = 1; i < 8; i++) {
    board[i] = 1;
    board[i * 8] = 1;
  }
  await blockSave(page, { board, tray: [0, 1, 2], score: 0, combo: 0 });
  await tap(page.locator('[data-piece="0"]'), info);
  await tap(page.locator('[data-block-cell="0"]'), info);
  await expect(page.locator("#score")).toHaveText("161");
  await expect(page.locator(".block-cell.filled")).toHaveCount(0);
  await expect(page.locator("#combo")).toHaveText("×1");
  await tap(page.locator('[data-piece="1"]'), info);
  await tap(page.locator('[data-block-cell="63"]'), info);
  await expect(page.locator(".game-feedback")).toContainText("won’t fit");
  await expect(page.locator("#score")).toHaveText("161");
  await tap(page.locator('[data-block-cell="8"]'), info);
  await expect(page.locator("#score")).toHaveText("163");
  await expect(page.locator("#combo")).toHaveText("—");
  await tap(page.locator('[data-piece="2"]'), info);
  await tap(page.locator('[data-block-cell="16"]'), info);
  await expect(page.locator("#score")).toHaveText("165");
  await expect(page.locator("[data-piece]")).toHaveCount(3);
  await page.reload();
  await expect(page.locator("#score")).toHaveText("165");
  await expect(page.locator(".block-cell.filled")).toHaveCount(4);
  await expect(page.locator("#best")).toHaveText("165");
});
test("Block Puzzle supports keyboard placement, terminal boards and corrupt save recovery", async ({
  page,
}) => {
  await open(page, "blocks");
  await blockSave(page, {
    board: Array(64).fill(0),
    tray: [0, 9, 2],
    score: 0,
    combo: 0,
  });
  await page.locator('[data-piece="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-block-cell="0"]')).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator("#score")).toHaveText("1");
  await expect(page.locator('[data-block-cell="1"]')).toBeFocused();
  await blockSave(page, {
    board: Array.from(
      { length: 64 },
      (_, i) => ((i % 8) + Math.floor(i / 8)) % 2,
    ),
    tray: [9, 9, 9],
    score: 42,
    combo: 0,
  });
  await expect(page.locator(".board-overlay")).toContainText("42");
  await page.locator(".board-overlay button").click();
  await expect(page.locator(".block-cell.filled")).toHaveCount(0);
  await blockSave(page, { board: [0], tray: [99, 0, 1], score: -5, combo: 0 });
  await expect(page.locator("#score")).toHaveText("0");
  await expect(page.locator("[data-piece]")).toHaveCount(3);
});
test("Block Puzzle drags a square onto the board", async ({ page }, info) => {
  await open(page, "blocks");
  await blockSave(page, {
    board: Array(64).fill(0),
    tray: [9, 1, 2],
    score: 0,
    combo: 0,
  });
  const piece = await page.locator('[data-piece="0"]').boundingBox(),
    cell = await page.locator('[data-block-cell="27"]').boundingBox();
  const from = { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 },
    to = { x: cell.x + cell.width / 2, y: cell.y + cell.height / 2 };
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
  await expect(page.locator(".block-cell.filled")).toHaveCount(4);
  await expect(page.locator("#score")).toHaveText("4");
});
test("Minesweeper preserves flags on a safe opening, supports keyboard and pauses its timer", async ({
  page,
}) => {
  await page.addInitScript(() => (Math.random = () => 0.25));
  await open(page, "mines");
  await page.locator("#flag-mode").click();
  await page.locator('[data-mine-cell="1"]').click();
  await expect(page.locator("#mines-left")).toHaveText("9");
  await page.locator("#flag-mode").click();
  await page.clock.install();
  await page.locator('[data-mine-cell="0"]').click();
  await expect(page.locator('[data-mine-cell="1"]')).toHaveAttribute(
    "aria-label",
    /flagged/,
  );
  await expect(page.locator(".mine-visible")).toHaveCount(0);
  await page.locator('[data-mine-cell="1"]').focus();
  await page.keyboard.press("f");
  await expect(page.locator("#mines-left")).toHaveText("10");
  await page.clock.runFor(2100);
  await expect(page.locator("#time")).toHaveText("0:02");
  await page.getByRole("button", { name: "How to play" }).click();
  await page.clock.runFor(3000);
  await page.locator("#help-done").click();
  await expect(page.locator("#time")).toHaveText("0:02");
  await expect(page.locator(".board-overlay")).toBeVisible();
  await page.locator("#game-start").click();
  await page.clock.runFor(1000);
  await expect(page.locator("#time")).toHaveText("0:03");
});
test("Minesweeper can win, save a best time, lose cleanly and restart on a larger board", async ({
  page,
}) => {
  await page.addInitScript(() => (Math.random = () => 0.25));
  await open(page, "mines");
  const field = createMinefield(8, 10, 0, () => 0.25);
  await page.locator('[data-mine-cell="0"]').click();
  for (let i = 0; i < 64; i++)
    if (!field[i].mine && !(await page.locator(".mine-result").count())) {
      const cell = page.locator(`[data-mine-cell="${i}"]`);
      if ((await cell.getAttribute("aria-label")).includes("covered"))
        await cell.click();
    }
  await expect(page.locator(".mine-result")).toContainText("clean sweep");
  const best = await page.locator("#best").textContent();
  await page.reload();
  await expect(page.locator("#best")).toHaveText(best);
  await page.locator('[data-mine-cell="0"]').click();
  await page
    .locator(`[data-mine-cell="${field.findIndex((c) => c.mine)}"]`)
    .click();
  await expect(page.locator(".mine-result")).toContainText("little boom");
  await expect(page.locator(".mine-visible")).toHaveCount(10);
  await expect(page.locator(".exploded")).toHaveCount(1);
  await page.locator(".mine-result button").click();
  await expect(page.locator(".mine-cell.revealed")).toHaveCount(0);
  await page.locator("#mine-level").selectOption("hard");
  await expect(page.locator(".mine-cell")).toHaveCount(144);
  await expect(page.locator("#mines-left")).toHaveText("28");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Piku Dash supports double jumps, landing, help pause, game over and saved best", async ({
  page,
}) => {
  await open(page, "dash");
  await page.clock.install();
  await page.locator("#game-start").click();
  await page.clock.runFor(300);
  await page.keyboard.press("Space");
  await page.clock.runFor(20);
  await expect(page.locator("#jump")).toHaveText("Jump again ↑");
  await page.keyboard.press("ArrowUp");
  await page.clock.runFor(20);
  await expect(page.locator("#jump")).toHaveText("Land to recharge");
  await page.keyboard.press("Space");
  await page.clock.runFor(1200);
  await expect(page.locator("#jump")).toHaveText("Jump ↑");
  await page.getByRole("button", { name: "How to play" }).click();
  const score = await page.locator("#score").textContent();
  await page.clock.runFor(1500);
  await page.locator("#help-done").click();
  await expect(page.locator("#score")).toHaveText(score);
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await page.locator("#game-start").click();
  await page.clock.runFor(10000);
  await expect(page.locator(".board-overlay")).toContainText("One more run");
  const best = await page.locator("#best").textContent();
  expect(Number(best)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator("#best")).toHaveText(best);
  await page.locator("#game-start").click();
  await expect(page.locator("#score")).toHaveText("0");
});
test("Piku Dash accepts a board tap and cleans up on navigation", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "dash");
  await page.clock.install();
  await page.locator("#game-start").click();
  await tap(page.locator("#game-board"), info);
  await page.clock.runFor(20);
  await expect(page.locator("#jump")).toHaveText("Jump again ↑");
  await page.getByRole("link", { name: "All games", exact: false }).click();
  await expect(page.locator(".game-card")).toHaveCount(12);
  await page.clock.runFor(5000);
  expect(errors).toEqual([]);
  await expect(page.locator(".board-overlay")).toHaveCount(0);
});
test("resetting records includes new games and keeps saved Block Puzzle progress", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => {
    for (const key of [
      "blocks",
      "dash",
      "mines-easy",
      "mines-normal",
      "mines-hard",
    ])
      localStorage.setItem("playpiku:best:" + key, "50");
    localStorage.setItem(
      "playpiku:blocks-save",
      JSON.stringify({
        board: Array(64).fill(0),
        tray: [0, 1, 2],
        score: 23,
        combo: 0,
      }),
    );
  });
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.locator("#clear-records").click();
  await page.locator("#clear-records").click();
  const data = await page.evaluate(() => ({
    records: ["blocks", "dash", "mines-easy", "mines-normal", "mines-hard"].map(
      (key) => localStorage.getItem("playpiku:best:" + key),
    ),
    save: JSON.parse(localStorage.getItem("playpiku:blocks-save")),
  }));
  expect(data.records).toEqual([null, null, null, null, null]);
  expect(data.save.score).toBe(23);
});
test("Minesweeper chording reveals neighbors after correct flags and limits excess flags", async ({
  page,
}) => {
  await page.addInitScript(() => (Math.random = () => 0.25));
  await open(page, "mines");
  await page.locator('[data-mine-cell="0"]').click();
  const initial = revealMines(
    createMinefield(8, 10, 0, () => 0.25),
    8,
    [0],
  ).cells;
  const center = initial.findIndex(
    (c, i) =>
      c.revealed &&
      c.number > 0 &&
      neighbors(i, 8).some((n) => !initial[n].mine && !initial[n].revealed),
  );
  expect(center).toBeGreaterThan(-1);
  const around = neighbors(center, 8),
    mines = around.filter((i) => initial[i].mine),
    safe = around.filter((i) => !initial[i].mine && !initial[i].revealed);
  await page.locator("#flag-mode").click();
  for (const index of mines)
    await page.locator(`[data-mine-cell="${index}"]`).click();
  await page.locator("#flag-mode").click();
  await page.locator(`[data-mine-cell="${center}"]`).click();
  for (const index of safe)
    await expect(page.locator(`[data-mine-cell="${index}"]`)).toHaveClass(
      /revealed/,
    );
  await expect(page.locator(".exploded")).toHaveCount(0);
  await page.getByRole("button", { name: "Restart game", exact: true }).click();
  await page
    .getByRole("button", { name: "Restart game", exact: true })
    .last()
    .click();
  await page.locator("#flag-mode").click();
  for (let i = 0; i < 11; i++)
    await page.locator(`[data-mine-cell="${i}"]`).click();
  await expect(page.locator("#mines-left")).toHaveText("0");
  await expect(page.locator(".game-feedback")).toContainText(
    "All flags are in use",
  );
});
