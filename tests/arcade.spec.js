import { test, expect } from "@playwright/test";
async function game(page, id) {
  await page.goto(`./#/play/${id}`);
  await expect(page.locator("#help-done")).toBeVisible();
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
}
test("library filters, project-base assets, footer and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.locator(".game-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Arcade", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Quick play", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All games", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(12);
  await expect(
    page.getByRole("link", { name: "Tanzil", exact: false }),
  ).toHaveAttribute("href", "https://tanzilahmed.tech/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("memory locks mismatches and completes a whole board with a saved record", async ({
  page,
}) => {
  await game(page, "memory");
  const cards = page.locator(".memory-card");
  await expect(cards).toHaveCount(16);
  const faces = await cards.locator(".card-front").allTextContents();
  const groups = {};
  faces.forEach((v, i) => (groups[v] ||= []).push(i));
  const different = faces.findIndex((v) => v !== faces[0]);
  await cards.nth(0).click();
  await cards.nth(different).click();
  await expect(page.locator("#moves")).toHaveText("1");
  await expect(page.locator(".flipped")).toHaveCount(0);
  for (const pair of Object.values(groups)) {
    await cards.nth(pair[0]).click();
    await cards.nth(pair[1]).click();
  }
  await expect(page.locator(".matched")).toHaveCount(16);
  await expect(page.locator(".game-feedback")).toContainText("All pairs found");
  await expect(page.locator("#best")).toHaveText("9");
  await page.reload();
  await expect(page.locator("#best")).toHaveText("9");
  await expect(page.locator("dialog")).not.toBeVisible();
});
test("2048 controls, single undo, saved state, terminal board and restart", async ({
  page,
}) => {
  await game(page, "2048");
  await page.evaluate(() =>
    localStorage.setItem(
      "playpiku:2048-save",
      JSON.stringify({
        board: [2, 2, ...Array(14).fill(0)],
        score: 0,
        won: false,
      }),
    ),
  );
  await page.reload();
  await page.locator('[data-dir="left"]').click();
  await expect(page.locator("#score")).toHaveText("4");
  await page.getByRole("button", { name: "Undo move" }).click();
  await expect(page.locator("#score")).toHaveText("0");
  await expect(page.locator('[data-value="2"]')).toHaveCount(2);
  await expect(page.locator("#undo")).toBeDisabled();
  await page.locator('[data-dir="left"]').click();
  await page.reload();
  await expect(page.locator("#score")).toHaveText("4");
  await page.evaluate(() =>
    localStorage.setItem(
      "playpiku:2048-save",
      JSON.stringify({
        board: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2],
        score: 100,
        won: false,
      }),
    ),
  );
  await page.reload();
  await expect(page.locator(".board-overlay")).toContainText("100");
  await page.locator(".board-overlay button").click();
  await expect(page.locator("#score")).toHaveText("0");
});
test("tic tac toe friend mode wins and resets round", async ({ page }) => {
  await game(page, "tictactoe");
  await page.locator("#opponent").selectOption("friend");
  for (const i of [0, 3, 1, 4, 2])
    await page.locator(`[data-cell="${i}"]`).click();
  await expect(page.locator("#turn")).toHaveText("X takes the round!");
  await expect(page.locator(".winning")).toHaveCount(3);
  await expect(page.locator("#x-wins")).toHaveText("1");
  await page.locator("#next-round").click();
  await expect(page.locator(".ttt-cell:disabled")).toHaveCount(0);
  await expect(page.locator("#x-wins")).toHaveText("1");
});
test("reaction rejects early taps, completes five rounds and saves the average", async ({
  page,
}) => {
  await game(page, "reaction");
  await page.clock.install();
  const panel = page.locator("#game-board");
  await panel.click();
  await expect(panel).toContainText("Wait for green");
  await panel.click();
  await expect(panel).toContainText("too eager");
  for (let i = 0; i < 5; i++) {
    await panel.click();
    await page.clock.runFor(4600);
    await expect(panel).toContainText("GO!");
    await panel.click();
  }
  await expect(panel).toContainText("average");
  await expect(page.locator(".round-dot.complete")).toHaveCount(5);
  await expect(page.locator("#best")).toContainText("ms");
});
test("snake starts, pauses for help, resumes, loses at a wall and restarts", async ({
  page,
}) => {
  await game(page, "snake");
  await page.clock.install();
  await page.locator("#game-start").click();
  await expect(page.locator("#game-start")).toHaveText("Pause");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await page.locator("#help-done").click();
  await expect(page.locator(".board-overlay")).toContainText("breather");
  await page.locator("#game-start").click();
  await page.clock.runFor(3000);
  await expect(page.locator(".board-overlay")).toContainText("One more bite");
  await page.locator(".board-overlay button").click();
  await expect(page.locator("#game-start")).toHaveText("Pause");
});
test("brick breaker launches, pauses and loses lives with a stationary paddle", async ({
  page,
}) => {
  await game(page, "breaker");
  await page.clock.install();
  await page.locator("#game-start").click();
  await page.clock.runFor(1500);
  await expect(page.locator("#game-start")).toHaveText("Ball in play");
  await page.locator("#pause").click();
  await expect(page.locator(".board-overlay")).toContainText("breather");
  const score = await page.locator("#score").textContent();
  await page.clock.runFor(1000);
  await expect(page.locator("#score")).toHaveText(score);
  await page.locator("#game-start").click();
  await page.clock.runFor(12000);
  await expect(page.locator("#lives")).not.toHaveText("3");
});
test("settings persist and all routes load without page errors or horizontal overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.locator("#motion-setting").check();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass("reduce-motion");
  for (const id of [
    "golf",
    "words",
    "stack",
    "blocks",
    "mines",
    "dash",
    "2048",
    "memory",
    "snake",
    "reaction",
    "tictactoe",
    "breaker",
  ]) {
    await game(page, id);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("2048 keyboard and touch input reach 2048 and allow continuing", async ({
  page,
}, testInfo) => {
  await game(page, "2048");
  await page.evaluate(() =>
    localStorage.setItem(
      "playpiku:2048-save",
      JSON.stringify({
        board: [1024, 1024, ...Array(14).fill(0)],
        score: 0,
        won: false,
      }),
    ),
  );
  await page.reload();
  await expect(page.locator("#game-board")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page),
      box = await page.locator("#game-board").boundingBox();
    const x = box.x + box.width * 0.7,
      y = box.y + box.height * 0.5;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - 80, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.locator("#game-board").focus();
    await page.keyboard.press("ArrowLeft");
  }
  await expect(page.locator(".board-overlay")).toContainText("Hello, 2048");
  await expect(page.locator("#score")).toHaveText("2048");
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await page.getByRole("button", { name: "Restart game", exact: true }).click();
  await expect(page.locator("dialog")).toContainText("Start a new game?");
  await page
    .getByRole("button", { name: "Restart game", exact: true })
    .last()
    .click();
  await expect(page.locator("#score")).toHaveText("0");
});
test("memory board sizes, pause mask and timer resume", async ({ page }) => {
  await game(page, "memory");
  await page.locator("#size").selectOption("18");
  await expect(page.locator(".memory-card")).toHaveCount(36);
  await page.clock.install();
  await page.locator(".memory-card").first().click();
  await page.clock.runFor(2100);
  await expect(page.locator("#time")).toHaveText("0:02");
  await page.locator("#game-start").click();
  await expect(page.locator(".memory-pause")).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.locator("#time")).toHaveText("0:02");
  await page.locator("#game-start").click();
  await page.clock.runFor(1000);
  await expect(page.locator("#time")).toHaveText("0:03");
});
test("computer takes a legal turn and hard mode blocks", async ({ page }) => {
  await game(page, "tictactoe");
  await page.locator('[data-cell="0"]').click();
  await expect(page.locator('[data-cell="4"]')).toHaveClass(/o/);
  await expect(page.locator("#turn")).toHaveText("Your turn · X");
  await page.locator('[data-cell="1"]').click();
  await expect(page.locator('[data-cell="2"]')).toHaveClass(/o/);
});
test("blocked browser storage still allows playing and explains session-only records", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Disabled", "SecurityError");
      },
    }),
  );
  await page.goto("./");
  await expect(page.locator("#toast")).toContainText("Storage is unavailable");
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.locator("#settings-status")).toContainText(
    "only for this visit",
  );
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.goto("./#/play/2048");
  await page.locator("#help-done").click();
  await expect(page.locator(".occupied")).toHaveCount(2);
  await page.locator('[data-dir="right"]').click();
  await expect(page.locator(".occupied")).not.toHaveCount(0);
});
