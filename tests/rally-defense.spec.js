import { test, expect } from "@playwright/test";
async function open(page, id) {
  await page.goto(`./play/${id}/`);
  await page.locator("#help-done").click();
  await expect(page.locator("#game-board")).toBeVisible();
}
function milliseconds(text) {
  const [minutes, seconds] = text.split(":");
  return (Number(minutes) * 60 + Number(seconds)) * 1000;
}
test("Rally practice steering, touch release, help pause and reset penalties work", async ({
  page,
}, info) => {
  await open(page, "rally");
  await page.clock.install();
  await page.locator("#game-start").click();
  await page.clock.runFor(1000);
  const before = await page.locator("canvas").evaluate((c) => c.toDataURL());
  const right = page.locator('[data-drive="right"]');
  await right.scrollIntoViewIfNeeded();
  const box = await right.boundingBox();
  if (info.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await page.clock.runFor(700);
    await expect(right).toHaveClass(/pressed/);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.keyboard.down("ArrowRight");
    await page.clock.runFor(700);
    await page.keyboard.up("ArrowRight");
  }
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).not.toBe(
    before,
  );
  await expect(right).not.toHaveClass(/pressed/);
  await page.getByRole("button", { name: "How to play" }).click();
  const paused = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.clock.runFor(2500);
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).toBe(
    paused,
  );
  await page.locator("#help-done").click();
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await page.getByRole("button", { name: "Restart game", exact: true }).click();
  await page
    .getByRole("button", { name: "Restart game", exact: true })
    .last()
    .click();
  await page.locator("#rally-mode").selectOption("relaxed");
  await page.locator("#game-start").click();
  await page.clock.runFor(1000);
  const old = milliseconds(await page.locator("#time").textContent());
  await page.locator("#back-to-road").click();
  const now = milliseconds(await page.locator("#time").textContent());
  expect(now - old).toBeGreaterThanOrEqual(2990);
  await page.keyboard.press("p");
  await expect(page.locator("#game-start")).toHaveText("Resume");
  await expect(page.locator("#lap")).toHaveText("1 / 3");
});
test("Tower Defense previews safely, validates path placement, upgrades, sells and clears a wave", async ({
  page,
}) => {
  test.setTimeout(60000);
  await open(page, "defense");
  await page.clock.install();
  await page.locator('[data-defense-cell="40"]').click();
  await expect(page.locator("#gold")).toHaveText("160");
  await expect(page.locator("#build-tower")).toBeEnabled();
  await page.locator('[data-defense-cell="26"]').click();
  await expect(page.locator("#build-tower")).toBeDisabled();
  await page.locator('[data-defense-cell="40"]').click();
  await page.locator("#build-tower").click();
  await expect(page.locator("#gold")).toHaveText("100");
  await expect(page.locator('[data-defense-cell="40"]')).toHaveAttribute(
    "aria-label",
    /Sprout tower, level 1/,
  );
  await page.locator("#upgrade-tower").click();
  await expect(page.locator("#gold")).toHaveText("55");
  await expect(page.locator("#tower-title")).toContainText("Level 2");
  await page.locator("#sell-tower").click();
  await expect(page.locator("#gold")).toHaveText("128");
  await page.locator('[data-tower-type="cannon"]').click();
  await page.locator('[data-defense-cell="55"]').click();
  await page.locator("#build-tower").click();
  await expect(page.locator("#gold")).toHaveText("28");
  await expect(page.locator("#upgrade-tower")).toBeDisabled();
  await page.locator("#game-start").click();
  await page.clock.runFor(1000);
  await page.locator("#defense-pause").click();
  const paused = await page.locator("canvas").evaluate((c) => c.toDataURL());
  await page.clock.runFor(2500);
  expect(await page.locator("canvas").evaluate((c) => c.toDataURL())).toBe(
    paused,
  );
  await page.locator("#sell-tower").click();
  await expect(page.locator("#gold")).toHaveText("98");
  await page.locator('[data-tower-type="rapid"]').click();
  await page.locator('[data-defense-cell="40"]').click();
  await page.locator("#build-tower").click();
  await page.locator("#defense-pause").click();
  await page.locator("#defense-speed").click();
  await page.clock.runFor(25000);
  await expect(page.locator("#game-start")).toHaveText("Start wave 2");
  expect(Number(await page.locator("#lives").textContent())).toBeGreaterThan(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:best:defense-meadow")),
    ),
  ).toBe(1);
});
test("Tower Defense keyboard navigation and terminal defeat leave a usable restart", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("./play/defense/");
  await expect(page.locator("#help-done")).toBeVisible();
  // A player can focus a cell before the queued dialog close event runs.
  await page.evaluate(async () => {
    document.querySelector("#help-done").click();
    document.querySelector('[data-defense-cell="0"]').focus();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await expect(page.locator('[data-defense-cell="0"]')).toBeFocused();
  await page.clock.install();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#build-tower")).toBeEnabled();
  await expect(page.locator("#gold")).toHaveText("160");
  await page.locator("#defense-speed").click();
  for (let i = 0; i < 4; i++) {
    await page.locator("#game-start").click();
    await page.clock.runFor(30000);
    if (await page.locator(".defense-result").count()) break;
  }
  await expect(page.locator(".defense-result")).toContainText("fresh start");
  await expect(page.locator("#lives")).toHaveText("0");
  await page.locator(".defense-result button").click();
  await expect(page.locator("#gold")).toHaveText("160");
  await expect(page.locator("#lives")).toHaveText("20");
  await expect(page.locator("#game-start")).toHaveText("Start wave 1");
});
test("a complete Rally race saves a record using normal keyboard driving", async ({
  page,
}) => {
  test.setTimeout(180000);
  await open(page, "rally");
  await page.locator("#rally-mode").selectOption("relaxed");
  await page.clock.install();
  await page.locator("#game-start").click();
  let direction = 0,
    braking = false,
    finished = false;
  // Observe the rendered car, headlights and next-checkpoint ring, then drive
  // with public keyboard controls. No game state or physics is replaced.
  for (let i = 0; i < 1800; i++) {
    const frame = await page.evaluate(() => {
      if (document.querySelector("#game-start").textContent === "Race again")
        return { done: true };
      const canvas = document.querySelector("canvas"),
        pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data,
        sums = { car: [0, 0, 0], lights: [0, 0, 0], goal: [0, 0, 0] };
      for (let y = 0; y < canvas.height; y += 2)
        for (let x = 0; x < canvas.width; x += 2) {
          const n = (y * canvas.width + x) * 4,
            r = pixels[n],
            g = pixels[n + 1],
            b = pixels[n + 2];
          let key;
          if (
            Math.abs(r - 230) < 3 &&
            Math.abs(g - 193) < 3 &&
            Math.abs(b - 117) < 3
          )
            key = "car";
          else if (r > 248 && g > 235 && b > 170 && b < 195) key = "lights";
          else if (
            Math.abs(r - 199) < 3 &&
            Math.abs(g - 243) < 3 &&
            Math.abs(b - 107) < 3
          )
            key = "goal";
          if (key) {
            sums[key][0] += x;
            sums[key][1] += y;
            sums[key][2]++;
          }
        }
      if (Object.values(sums).some((s) => !s[2])) return null;
      const c = sums.car,
        l = sums.lights,
        t = sums.goal,
        x = c[0] / c[2],
        y = c[1] / c[2],
        heading = Math.atan2(l[1] / l[2] - y, l[0] / l[2] - x),
        target = Math.atan2(t[1] / t[2] - y, t[0] / t[2] - x);
      return {
        error: Math.atan2(
          Math.sin(target - heading),
          Math.cos(target - heading),
        ),
      };
    });
    if (frame?.done) {
      finished = true;
      break;
    }
    if (!frame) {
      await page.clock.runFor(16);
      continue;
    }
    const next = Math.abs(frame.error) < 0.09 ? 0 : Math.sign(frame.error),
      brake = Math.abs(frame.error) > 0.32;
    if (next !== direction) {
      if (direction)
        await page.keyboard.up(direction > 0 ? "ArrowRight" : "ArrowLeft");
      if (next) await page.keyboard.down(next > 0 ? "ArrowRight" : "ArrowLeft");
      direction = next;
    }
    if (brake !== braking) {
      if (brake) await page.keyboard.down("ArrowDown");
      else await page.keyboard.up("ArrowDown");
      braking = brake;
    }
    await page.clock.runFor(100);
  }
  expect(finished).toBe(true);
  await expect(page.locator("#lap")).toHaveText("3 / 3");
  await expect(page.locator(".board-overlay")).toContainText("personal best");
  const best = await page.locator("#best").textContent();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("playpiku:best:rally-meadow-relaxed")),
    ),
  ).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator("#best")).toHaveText(best);
});
