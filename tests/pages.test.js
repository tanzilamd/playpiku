import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { games } from "../src/catalog.js";
import { SITE_PATH, SITE_URL, gamePath, readRoute } from "../src/site.js";
import { renderPage } from "../scripts/pages.js";
test("logo links point at the plain homepage and legacy root/game fragments resolve safely", () => {
  const html = readFileSync("index.html", "utf8");
  assert.match(html, /class="brand" href="\/playpiku\/"/);
  assert.match(html, /class="footer-logo" href="\/playpiku\/"/);
  assert.deepEqual(readRoute(new URL(SITE_URL + "#/")), {
    id: null,
    legacy: true,
  });
  assert.deepEqual(readRoute(new URL(SITE_URL + "#/play/golf")), {
    id: "golf",
    legacy: true,
  });
  assert.equal(readRoute(new URL(SITE_URL + "play/rally/")).id, "rally");
  assert.equal(gamePath("defense"), "/playpiku/play/defense/");
});
test("every public game page contains unique crawler-visible metadata and a valid PNG", () => {
  const template = readFileSync("index.html", "utf8"),
    images = new Set();
  for (const game of games) {
    const html = renderPage(template, game, games.length),
      tags = Object.fromEntries(
        [
          ...html.matchAll(
            /<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"\s*\/?\s*>/g,
          ),
        ].map((m) => [m[1], m[2]]),
      );
    assert.equal(tags["og:url"], SITE_URL + "play/" + game.id + "/");
    assert.ok(tags["og:title"].includes(game.name));
    assert.equal(tags["twitter:image"], tags["og:image"]);
    assert.equal(new URL(tags["og:image"]).protocol, "https:");
    images.add(tags["og:image"]);
    const png = readFileSync(
      "assets/" + new URL(tags["og:image"]).pathname.split("/").at(-1),
    );
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.ok(html.includes('<base href="' + SITE_PATH + '"'));
    assert.ok(html.includes("<noscript>"));
  }
  assert.equal(images.size, games.length);
});
