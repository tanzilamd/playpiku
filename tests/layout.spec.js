import { test, expect } from "@playwright/test";
import { games } from "../src/catalog.js";
test("whole-site layout, dialogs and controls stay usable across screen sizes", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const sizes =
    info.project.name === "mobile"
      ? [
          [320, 640],
          [390, 844],
          [667, 375],
        ]
      : [
          [768, 1024],
          [1024, 768],
          [1440, 900],
        ];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto("./");
    await expect(page.locator(".game-card")).toHaveCount(17);
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await expect(page.locator(".skip-link")).toHaveCSS("clip-path", "none");
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    const headerFits = await page.evaluate(() => {
      const a = document.querySelector(".brand").getBoundingClientRect();
      const b = document.querySelector("nav").getBoundingClientRect();
      const c = document
        .querySelector("#settings-button")
        .getBoundingClientRect();
      return (
        a.right <= b.left + 1 && b.right <= c.left + 1 && c.right <= innerWidth
      );
    });
    expect(headerFits, `Header at ${width}×${height}`).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    for (const game of games) {
      await page.goto(`./#/play/${game.id}`);
      await page.locator("#game-board").waitFor();
      if (await page.locator("#help-done").isVisible())
        await page.locator("#help-done").click();
      if (game.id === "mines")
        await page.locator("#mine-level").selectOption("hard");
      if (game.id === "memory") await page.locator("#size").selectOption("18");
      const issues = await page.evaluate(() => {
        const problems = [],
          panel = document.querySelector(".play-panel").getBoundingClientRect();
        if (document.documentElement.scrollWidth > innerWidth + 1)
          problems.push("page overflow");
        const h = document.querySelector(".game-page-heading h1"),
          range = document.createRange();
        range.selectNodeContents(h);
        const title = range.getBoundingClientRect(),
          help = document.querySelector("#help-button").getBoundingClientRect();
        if (
          title.left < help.right &&
          title.right > help.left &&
          title.top < help.bottom &&
          title.bottom > help.top
        )
          problems.push("title overlaps help");
        for (const el of document.querySelectorAll(
          ".game-stats,.game-controls .button,.game-options select",
        )) {
          if (!el.getClientRects().length) continue;
          const r = el.getBoundingClientRect();
          if (r.left < panel.left || r.right > panel.right)
            problems.push("control outside panel");
        }
        const overlay = document.querySelector("#game-board .board-overlay");
        if (overlay) {
          const board = document
              .querySelector("#game-board")
              .getBoundingClientRect(),
            button = overlay.querySelector("button").getBoundingClientRect();
          if (button.top < board.top || button.bottom > board.bottom)
            problems.push("overlay action clipped");
        }
        return problems;
      });
      expect(issues, `${game.name} at ${width}×${height}`).toEqual([]);
      await page.getByRole("button", { name: "How to play" }).click();
      expect(
        await page.locator("dialog").evaluate((d) => {
          const r = d.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth + 1 &&
            r.bottom <= innerHeight + 1 &&
            d.scrollWidth <= d.clientWidth + 2
          );
        }),
        `${game.name} guide at ${width}×${height}`,
      ).toBe(true);
      await page.locator("#help-done").click();
    }
    await page.getByRole("button", { name: "Open settings" }).click();
    expect(
      await page
        .locator("dialog")
        .evaluate((d) => d.scrollWidth <= d.clientWidth + 2),
    ).toBe(true);
    await page.getByRole("button", { name: "Close settings" }).click();
  }
  expect(errors).toEqual([]);
});
