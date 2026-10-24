import { test, expect } from "@playwright/test";
import { newHarvest, harvestSwap } from "../src/engines/harvest.js";
import {
  newTraffic,
  stepTraffic,
  trafficLane,
} from "../src/engines/traffic.js";
async function open(page, id) {
  await page.goto(`./play/${id}/`);
  await expect(page.locator("#help-done")).toBeVisible();
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
}
async function installClock(page) {
  await page.clock.install({ time: new Date("2026-10-24T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-24T00:00:01Z"));
}
async function cropSwap(page, a, b) {
  await page.locator(`[data-crop="${a}"]`).click();
  await page.locator(`[data-crop="${b}"]`).click();
  await page.clock.runFor(300);
}

test("Harvest accepts tap, swipe and keyboard, pauses safely, and restores a stable saved board", async ({
  page,
}) => {
  await page.addInitScript(() => (Date.now = () => 1));
  await open(page, "harvest");
  await installClock(page);
  await page.locator("#game-start").click();
  await cropSwap(page, 1, 8);
  await expect(page.locator("#moves")).toHaveText("21");
  expect(Number(await page.locator("#score").textContent())).toBeGreaterThan(0);
  await page.locator("#harvest-hint").click();
  const hinted = await page
    .locator(".crop-cell.hinted")
    .evaluateAll((bs) => bs.map((b) => Number(b.dataset.crop)));
  expect(hinted).toHaveLength(2);
  const a = page.locator(`[data-crop="${hinted[0]}"]`),
    b = page.locator(`[data-crop="${hinted[1]}"]`);
  await a.scrollIntoViewIfNeeded();
  const pa = await a.boundingBox(),
    pb = await b.boundingBox();
  await page.mouse.move(pa.x + pa.width / 2, pa.y + pa.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2, {
    steps: 4,
  });
  await page.mouse.up();
  await page.clock.runFor(400);
  await expect(page.locator("#moves")).toHaveText("20");
  await page.locator("#harvest-hint").click();
  const hintedCell = await page
    .locator(".crop-cell.hinted")
    .first()
    .getAttribute("data-crop");
  const first = page.locator(`[data-crop="${hintedCell}"]`);
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(first).toHaveAttribute("aria-pressed", "false");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("playpiku:harvest-save")),
  );
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await page.clock.runFor(1000);
  await page.locator("#help-done").click();
  await expect(page.locator(".crop-cell").first()).toBeDisabled();
  await page.locator("#game-start").click();
  await page.reload();
  await expect(page.locator("#moves")).toHaveText("20");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:harvest-save")),
    ),
  ).toEqual(saved);
  await page.locator("#game-start").click();
  await page.locator("#harvest-shuffle").click();
  await expect(page.locator("#harvest-shuffle")).toBeDisabled();
  await expect(page.locator("#moves")).toHaveText("20");
});
test("Harvest plays a whole Adventure level through public hints, saves stars and unlocks the map", async ({
  page,
}) => {
  await page.addInitScript(() => (Date.now = () => 1));
  await open(page, "harvest");
  await installClock(page);
  await page.locator("#game-start").click();
  for (
    let i = 0;
    i < 22 && !(await page.locator(".race-result").count());
    i++
  ) {
    await page.locator("#harvest-hint").click();
    const pair = await page
      .locator(".crop-cell.hinted")
      .evaluateAll((bs) => bs.map((b) => Number(b.dataset.crop)));
    expect(pair).toHaveLength(2);
    await cropSwap(page, ...pair);
  }
  await expect(page.locator(".race-result")).toContainText(
    "lovely little harvest",
  );
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("playpiku:harvest-progress")),
  );
  expect(progress.unlocked).toBe(2);
  expect(progress.stars[0]).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Next level", exact: true }).click();
  await expect(page.locator("#level")).toHaveText("2 / 24");
  await page.locator("#harvest-map").click();
  await expect(page.locator('[data-level="2"]')).toBeEnabled();
  await expect(page.locator('[data-level="3"]')).toBeDisabled();
  await page.locator('[data-level="1"]').click();
  await expect(page.locator("#level")).toHaveText("1 / 24");
  await page.locator("#harvest-mode").selectOption("relaxed");
  await expect(page.locator("#moves")).toHaveText("∞");
  await page.locator("#harvest-hint").click();
});
test("Harvest terminal saves remain replayable and corrupt saves fall back to a working garden", async ({
  page,
}) => {
  await open(page, "harvest");
  const fixture = newHarvest(1, "normal", 1);
  fixture.moves = 1;
  fixture.turns = 21;
  await page.evaluate(
    (s) => localStorage.setItem("playpiku:harvest-save", JSON.stringify(s)),
    fixture,
  );
  await page.reload();
  await page.locator("#game-start").click();
  await installClock(page);
  await cropSwap(page, 1, 8);
  await expect(page.locator(".race-result")).toContainText("Another harvest");
  await expect(page.locator(".crop-cell").first()).toBeDisabled();
  await page.reload();
  await expect(page.locator(".race-result")).toContainText("Another harvest");
  await page.getByRole("button", { name: "Try Relaxed", exact: true }).click();
  await expect(page.locator("#moves")).toHaveText("∞");
  const almost = newHarvest(1, "normal", 1);
  almost.moves = 1;
  almost.turns = 21;
  almost.collected[0] = 9;
  const win = harvestSwap(almost, 1, 8).world;
  await page.locator("#game-start").click();
  await page.evaluate(
    (s) => localStorage.setItem("playpiku:harvest-save", JSON.stringify(s)),
    win,
  );
  await page.reload();
  await expect(page.locator(".race-result")).toContainText(
    "lovely little harvest",
  );
  await page.evaluate(() => {
    localStorage.setItem(
      "playpiku:harvest-save",
      '{"board":[null],"level":99}',
    );
    localStorage.setItem(
      "playpiku:harvest-progress",
      '{"unlocked":999,"stars":["bad"]}',
    );
  });
  await page.reload();
  await expect(page.locator(".crop-cell")).toHaveCount(49);
  await page.locator("#game-start").click();
  await expect(page.locator("#harvest-hint")).toBeEnabled();
});
test("Traffic controls support lane changes, simultaneous touch holds, help pause, and earned car purchases", async ({
  page,
}, info) => {
  await open(page, "traffic");
  await page.evaluate(() =>
    localStorage.setItem(
      "playpiku:traffic-garage",
      JSON.stringify({ bank: 120, owned: ["mint"] }),
    ),
  );
  await page.reload();
  await page.locator("#traffic-garage").click();
  await page.locator('[data-car="coral"]').click();
  await expect(page.locator("#garage-bank")).toContainText("70 coins");
  await expect(page.locator('[data-car="coral"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-car="gold"]')).toBeDisabled();
  await page.locator("#traffic-garage").click();
  await installClock(page);
  await page.locator("#game-start").click();
  await page.keyboard.press("ArrowLeft");
  await page.clock.runFor(1000);
  const before = await page.locator("canvas").evaluate((c) => c.toDataURL());
  if (info.project.name === "mobile") {
    const brake = page.locator('[data-drive="brake"]');
    await brake.scrollIntoViewIfNeeded();
    const b = await brake.boundingBox(),
      r = await page.locator('[data-drive="right"]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 },
        { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 2 },
      ],
    });
    await expect(brake).toHaveClass(/pressed/);
    await expect(page.locator('[data-drive="right"]')).toHaveClass(/pressed/);
    await page.clock.runFor(500);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator("[data-drive].pressed")).toHaveCount(0);
  } else {
    await page.keyboard.down("ArrowUp");
    await page.clock.runFor(800);
    await page.keyboard.up("ArrowUp");
    expect(
      await page.locator("#traffic-energy").evaluate((m) => m.value),
    ).toBeLessThan(100);
  }
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).not.toBe(
    before,
  );
  const nitro = page.locator('[data-drive="boost"]');
  await nitro.focus();
  const energy = await page.locator("#traffic-energy").evaluate((m) => m.value);
  await page.keyboard.down("Enter");
  await expect(nitro).toHaveClass(/pressed/);
  await page.clock.runFor(400);
  await page.keyboard.up("Enter");
  await expect(nitro).not.toHaveClass(/pressed/);
  expect(
    await page.locator("#traffic-energy").evaluate((m) => m.value),
  ).toBeLessThan(energy);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await page.locator("#help-done").click();
  const paused = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.clock.runFor(3000);
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).toBe(
    paused,
  );
  await expect(page.locator("[data-drive].pressed")).toHaveCount(0);
});
test("Traffic completes a full challenge using public steering and banks coins exactly once", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => (Date.now = () => 314159));
  await open(page, "traffic");
  await page.locator("#traffic-mode").selectOption("challenge");
  await installClock(page);
  await page.locator("#game-start").click();
  let mirror = newTraffic("challenge", 314159),
    lane = 1;
  // Drive ordinary keys on a seeded road. Both engines retain their real physics.
  for (let i = 0; i < 500 && mirror.status === "playing"; i++) {
    const row = mirror.rows.find((r) => r.at - mirror.distance > 10);
    if (row && row.at - mirror.distance < 65) {
      while (lane !== row.free) {
        const direction = Math.sign(row.free - lane);
        await page.keyboard.press(direction < 0 ? "ArrowLeft" : "ArrowRight");
        lane += direction;
        mirror = trafficLane(mirror, direction);
      }
    }
    await page.clock.runFor(100);
    for (let j = 0; j < 12 && mirror.status === "playing"; j++)
      mirror = stepTraffic(mirror, 1 / 120);
  }
  await page.clock.runFor(300);
  await expect(page.locator(".race-result")).toContainText(
    "Challenge complete",
  );
  await expect(page.locator("#distance")).toHaveText("1500 / 1,500 m");
  const bank = await page.evaluate(
    () => JSON.parse(localStorage.getItem("playpiku:traffic-garage")).bank,
  );
  expect(bank).toBeGreaterThan(0);
  await page.clock.runFor(3000);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("playpiku:traffic-garage")).bank,
    ),
  ).toBe(bank);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:best:traffic-challenge")),
    ),
  ).toBeGreaterThan(1500);
  await page.locator(".race-result button").click();
  await expect(page.locator("#distance")).toHaveText("0 / 1,500 m");
  await expect(page.locator("#traffic-mode")).toBeEnabled();
});
test("Traffic collisions end cleanly and retry releases controls and preserves earned records", async ({
  page,
}) => {
  await page.addInitScript(() => (Date.now = () => 1));
  await open(page, "traffic");
  await installClock(page);
  await page.locator("#game-start").click();
  await page.clock.runFor(20000);
  await expect(page.locator(".race-result")).toContainText("fresh start");
  await expect(page.locator("#game-start")).toHaveText("Drive again");
  const best = await page.locator("#best").textContent();
  await page.clock.runFor(2000);
  await expect(page.locator("#best")).toHaveText(best);
  await page.locator(".race-result button").click();
  await expect(page.locator("#distance")).toHaveText("0 m");
  await expect(page.locator("[data-drive].pressed")).toHaveCount(0);
});
test("Moto completes a real trail, saves its best-time ghost, and offers the next trail", async ({
  page,
}) => {
  test.setTimeout(60000);
  await open(page, "moto");
  await installClock(page);
  await page.locator("#game-start").click();
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(15000);
  await page.keyboard.up("ArrowUp");
  await expect(page.locator(".race-result")).toContainText("medal");
  await expect(page.locator(".race-result")).toContainText("personal best");
  const saved = await page.evaluate(() => ({
    best: JSON.parse(localStorage.getItem("playpiku:best:moto-trail-1")),
    ghost: JSON.parse(localStorage.getItem("playpiku:moto-ghost:trail-1")),
  }));
  expect(saved.best).toBeGreaterThan(0);
  expect(saved.ghost.frames.length).toBeGreaterThan(20);
  await page.reload();
  await expect(page.locator("#best")).not.toHaveText("—");
  await page.locator("#game-start").click();
  await page.clock.runFor(2000);
  const withGhost = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.locator("#moto-ghost").click();
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).not.toBe(
    withGhost,
  );
  await expect(page.locator("#moto-ghost")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(15000);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Next trail", exact: true }).click();
  await expect(page.locator("#moto-track")).toHaveValue("trail-2");
  await expect(page.locator("#game-start")).toHaveText("Start riding");
});
test("Moto landing crashes recover at checkpoints; pause freezes time and clears held controls", async ({
  page,
}) => {
  test.setTimeout(60000);
  await open(page, "moto");
  await installClock(page);
  await page.locator("#game-start").click();
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowLeft");
  await page.clock.runFor(9000);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.up("ArrowLeft");
  await expect(page.locator(".race-result")).toContainText("tumble");
  const time = parseFloat(await page.locator("#time").textContent());
  await page
    .locator(".race-result")
    .getByRole("button", { name: "Back to checkpoint (+3s)", exact: true })
    .click();
  expect(
    parseFloat(await page.locator("#time").textContent()) - time,
  ).toBeGreaterThanOrEqual(3);
  await expect(page.locator("#moto-checkpoint")).toContainText("+3s");
  await expect(page.locator("[data-drive].pressed")).toHaveCount(0);
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(600);
  await page.getByRole("button", { name: "How to play" }).click();
  await page.keyboard.up("ArrowUp");
  const paused = await page.locator("#time").textContent();
  await page.clock.runFor(5000);
  await page.locator("#help-done").click();
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await expect(page.locator("#time")).toHaveText(paused);
  await expect(page.locator("[data-drive].pressed")).toHaveCount(0);
});
test("resetting records includes new games and ghosts while keeping farm progress and owned cars", async ({
  page,
}) => {
  await open(page, "harvest");
  const save = await page.evaluate(() =>
    localStorage.getItem("playpiku:harvest-save"),
  );
  await page.evaluate(() => {
    for (const id of [
      "harvest-1",
      "harvest-24",
      "traffic-endless",
      "traffic-challenge",
      "moto-trail-1",
      "moto-trail-12",
    ])
      localStorage.setItem("playpiku:best:" + id, "100");
    localStorage.setItem("playpiku:moto-ghost:trail-1", "{}");
    localStorage.setItem("playpiku:moto-ghost:trail-12", "{}");
    localStorage.setItem(
      "playpiku:harvest-progress",
      '{"unlocked":4,"stars":[2,1,1]}',
    );
    localStorage.setItem(
      "playpiku:traffic-garage",
      '{"bank":70,"owned":["mint","coral"]}',
    );
  });
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("button", { name: "Reset records", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm reset", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      [
        "harvest-1",
        "harvest-24",
        "traffic-endless",
        "traffic-challenge",
        "moto-trail-1",
        "moto-trail-12",
      ].map((id) => localStorage.getItem("playpiku:best:" + id)),
    ),
  ).toEqual(Array(6).fill(null));
  expect(
    await page.evaluate(() =>
      localStorage.getItem("playpiku:moto-ghost:trail-12"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("playpiku:traffic-garage")).owned,
    ),
  ).toContain("coral");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("playpiku:harvest-progress")).unlocked,
    ),
  ).toBe(4);
  if (save)
    expect(
      await page.evaluate(() => localStorage.getItem("playpiku:harvest-save")),
    ).toBe(save);
});
