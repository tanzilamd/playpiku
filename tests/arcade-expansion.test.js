import test from "node:test";
import assert from "node:assert/strict";
import {
  newBubble,
  bubbleCenter,
  bubbleNeighbors,
  traceBubble,
  settleBubble,
  shootBubble,
  restoreBubble,
  BUBBLE_LEVELS,
} from "../src/engines/bubble.js";
import {
  newPinball,
  launchPinball,
  stepPinball,
  nudgePinball,
  PINBALL_TARGETS,
  PINBALL_BUMPERS,
  flipperSegment,
} from "../src/engines/pinball.js";
import {
  newMeteor,
  stepMeteor,
  damageMeteor,
  meteorPickup,
} from "../src/engines/meteor.js";
import { filterLibrary, normalizeFavorites } from "../src/library.js";
import { games } from "../src/catalog.js";
import {
  fixtureGames as listedGames,
  fixtureConfig,
} from "./library-fixture.js";
import config from "../src/site-config.js";
import { resolveSiteConfig } from "../src/configuration.js";
const rng =
  (seed = 73) =>
  () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

test("bubble hex neighbors have no row wrapping, and bounced guides end at a free adjacent cell", () => {
  const s = newBubble();
  const b = { row: 1, col: 4, color: 1 };
  assert.equal(bubbleNeighbors(b, s.board).length, 6);
  assert.ok(
    !bubbleNeighbors({ row: 0, col: 9 }, s.board).some(
      (n) => n.row === 0 && n.col === 0,
    ),
  );
  for (let a = -1.35; a <= 1.35; a += 0.1) {
    const t = traceBubble(s.board, a);
    assert.ok(t.cell);
    assert.ok(
      !s.board.some((b) => b.row === t.cell.row && b.col === t.cell.col),
    );
    assert.ok(t.path.every((p) => p.x >= 35 && p.x <= 365));
    assert.ok(bubbleNeighbors(t.cell, s.board).length);
  }
  assert.ok(traceBubble(s.board, 1.3).path.length > 2);
});
test("bubble matching pops a group, drops disconnected bubbles, and wins on the last shot", () => {
  const s = {
    ...newBubble(),
    current: 1,
    next: 1,
    shots: 1,
    board: [
      { row: 0, col: 0, color: 1 },
      { row: 0, col: 1, color: 1 },
      { row: 1, col: 0, color: 2 },
    ],
  };
  const r = settleBubble(s, { row: 0, col: 2 }, () => 0);
  assert.equal(r.popped.length, 3);
  assert.equal(r.dropped.length, 1);
  assert.equal(r.state.status, "won");
  assert.equal(r.state.score, 100);
  assert.equal(r.state.shots, 0);
  assert.equal(s.board.length, 3);
  assert.equal(settleBubble(s, { row: 0, col: 0 }).state, s);
  const miss = settleBubble(
    { ...newBubble(), shots: 1, current: 4 },
    { row: 4, col: 4 },
  );
  assert.equal(miss.state.status, "lost");
});
test("all twelve bubble gardens can be cleared within their shot budget using legal visible shots", () => {
  for (let level = 1; level <= BUBBLE_LEVELS; level++) {
    let s = newBubble(level, () => 0.1),
      count = 0;
    while (s.status === "playing" && count++ < 70) {
      let best = null;
      const tried = new Set();
      for (let swap = 0; swap < 2; swap++) {
        const w = swap ? { ...s, current: s.next, next: s.current } : s;
        for (let a = -1.34; a <= 1.34; a += 0.025) {
          const cell = traceBubble(w.board, a).cell;
          if (!cell) continue;
          const key = `${swap}:${cell.row}:${cell.col}`;
          if (tried.has(key)) continue;
          tried.add(key);
          const r = shootBubble(w, a, () => 0.1),
            adj = bubbleNeighbors(cell, w.board).filter(
              (n) => n.color === w.current,
            ).length,
            score =
              (r.popped.length * 20 + r.dropped.length * 40) * 10 +
              adj * 4 -
              cell.row * 0.03;
          if (!best || score > best.score) best = { score, state: r.state };
        }
      }
      assert.ok(best);
      s = best.state;
    }
    assert.equal(s.status, "won", `Garden ${level} should be solvable`);
  }
});
test("bubble saves reject duplicate cells, invalid colors, bad geometry and terminal states", () => {
  const s = newBubble();
  assert.deepEqual(restoreBubble(s), s);
  const invalid = [
    { ...s, board: [s.board[0], s.board[0]] },
    { ...s, board: [{ row: 2, col: 40, color: 1 }] },
    { ...s, current: 9 },
    { ...s, shots: 0 },
    { ...s, status: "won" },
    { ...s, board: [{ row: 0.5, col: 1, color: 1 }] },
  ];
  for (const v of invalid) assert.equal(restoreBubble(v), null);
});
test("pinball launches only once, catches early drains and consumes exactly three balls", () => {
  const s = newPinball();
  assert.equal(launchPinball(s), true);
  assert.equal(launchPinball(s), false);
  s.ball.y = 595;
  s.ball.vy = 500;
  assert.ok(stepPinball(s, 1 / 60).includes("save"));
  assert.equal(s.balls, 3);
  assert.equal(s.saves, 1);
  s.save = 0;
  for (let i = 2; i >= 0; i--) {
    s.ball.y = 595;
    s.ball.vy = 500;
    stepPinball(s, 1 / 60);
    assert.equal(s.balls, i);
    if (i) {
      assert.equal(s.launched, false);
      launchPinball(s);
      s.save = 0;
    }
  }
  assert.equal(s.over, true);
  assert.equal(launchPinball(s), false);
  const score = s.score;
  stepPinball(s, 1);
  assert.equal(s.score, score);
});
test("pinball bumpers score once per contact, targets grow the multiplier, and nudges are bounded", () => {
  const s = newPinball();
  launchPinball(s);
  const b = PINBALL_BUMPERS[0];
  s.ball = { x: b.x, y: b.y + b.r + 7, vx: 0, vy: -200 };
  assert.ok(stepPinball(s, 0.005).includes("bumper"));
  assert.equal(s.score, 100);
  assert.ok(s.ball.vy > 0);
  for (const t of PINBALL_TARGETS) {
    s.ball = { x: t.x, y: t.y + 20, vx: 0, vy: -100 };
    stepPinball(s, 0.005);
  }
  assert.equal(s.multiplier, 2);
  assert.ok(s.targets.every((x) => !x));
  assert.equal(nudgePinball(s), true);
  assert.equal(nudgePinball(s), false);
  s.nudgeCooldown = 0;
  nudgePinball(s);
  s.nudgeCooldown = 0;
  nudgePinball(s);
  s.nudgeCooldown = 0;
  assert.equal(nudgePinball(s), false);
  assert.equal(s.nudges, 0);
  const left = flipperSegment(0, 1),
    rest = flipperSegment(0, 0);
  assert.ok(left.by < rest.by);
});
test("pinball physics stays finite at different frame times and supports a complete playable run", () => {
  const s = newPinball();
  launchPinball(s);
  for (let i = 0; i < 10000 && !s.over; i++) {
    stepPinball(s, i % 2 ? 1 / 120 : 1 / 45, {
      left: i % 60 < 20,
      right: i % 83 < 25,
    });
    assert.ok(
      [s.ball.x, s.ball.y, s.ball.vx, s.ball.vy].every(Number.isFinite),
    );
    assert.ok(s.ball.x >= 20 && s.ball.x <= 380);
    if (!s.launched && !s.over) launchPinball(s);
  }
  assert.ok(s.score > 0);
  assert.equal(s.over, true);
  assert.ok(s.bumps > 0);
});
test("meteor movement clamps to the flight zone, normalizes diagonal speed, and auto-fires", () => {
  const s = newMeteor(),
    start = { ...s.ship };
  stepMeteor(s, 0.04, { right: true, up: true });
  assert.ok(
    Math.abs(Math.hypot(s.ship.x - start.x, s.ship.y - start.y) - 260 * 0.04) <
      0.01,
  );
  assert.ok(s.shots.length > 0);
  for (let i = 0; i < 120; i++)
    stepMeteor(s, 0.04, { right: true, down: true }, () => 0.2);
  assert.equal(s.ship.x, 378);
  assert.equal(s.ship.y, 540);
  stepMeteor(s, 0.04, { target: { x: -1e9, y: 1e9 } });
  assert.ok(s.ship.x >= 22 && s.ship.y <= 540);
});
test("meteor shields, grace windows, repairs and temporary weapons are bounded", () => {
  const s = newMeteor();
  assert.equal(damageMeteor(s), true);
  assert.equal(s.shield, 0);
  assert.equal(s.health, 3);
  assert.equal(damageMeteor(s), false);
  s.invincible = 0;
  damageMeteor(s);
  assert.equal(s.health, 2);
  meteorPickup(s, "repair");
  assert.equal(s.health, 3);
  for (let i = 0; i < 10; i++) {
    meteorPickup(s, "shield");
    meteorPickup(s, "power");
  }
  assert.equal(s.power, 3);
  assert.equal(s.shield, 3);
  s.powerTime = 0.01;
  stepMeteor(s, 0.02);
  assert.equal(s.power, 1);
  s.shield = 0;
  s.health = 1;
  s.invincible = 0;
  damageMeteor(s);
  assert.equal(s.over, true);
});
test("meteor projectile collisions award a kill once and every fourth kill drops an upgrade", () => {
  const s = newMeteor();
  s.kills = 3;
  s.spawnTimer = 99;
  s.enemies = [
    {
      id: 1,
      x: 200,
      originX: 200,
      y: 150,
      phase: 0,
      kind: "rock",
      r: 19,
      hp: 1,
      speed: 0,
      age: 0,
      fire: 99,
    },
  ];
  s.shots = [{ x: 200, y: 160, vx: 0, vy: -530 }];
  const r = stepMeteor(s, 0.02, {}, () => 0.2);
  assert.ok(r.includes("hit"));
  assert.equal(s.kills, 4);
  assert.equal(s.pickups.length, 1);
  assert.equal(s.score, 65);
  stepMeteor(s, 0.02, {}, () => 0.2);
  assert.equal(s.kills, 4);
});
test("meteor waves advance and the third-wave guardian has a real win condition", () => {
  const s = newMeteor();
  s.wave = 3;
  s.spawned = 8;
  s.enemies = [];
  assert.ok(stepMeteor(s, 0.02).includes("boss"));
  assert.ok(s.boss.hp > 0);
  const hp = s.boss.maxHp;
  s.boss.y = 100;
  s.boss.hp = 1;
  s.shots = [{ x: 200, y: 120, vx: 0, vy: -530 }];
  s.health = 2;
  assert.ok(stepMeteor(s, 0.02, {}, () => 0).includes("boss-clear"));
  assert.equal(s.boss, null);
  assert.equal(s.health, 3);
  assert.ok(s.transition > 0);
  assert.ok(hp >= 36);
  for (let i = 0; i < 101; i++) stepMeteor(s, 0.02, {}, () => 0);
  assert.equal(s.wave, 4);
  assert.ok(s.shield >= 2);
});
test("meteor objects stay bounded during an extended surviving flight", () => {
  const s = newMeteor(),
    random = rng();
  for (let i = 0; i < 18000; i++) {
    s.invincible = 2;
    stepMeteor(
      s,
      1 / 60,
      { target: { x: 200 + Math.sin(i / 150) * 140, y: 480 } },
      random,
    );
    assert.ok(
      s.enemies.length < 20 &&
        s.shots.length < 60 &&
        s.hostile.length < 100 &&
        s.particles.length < 200,
    );
    assert.ok(Number.isFinite(s.ship.x) && Number.isFinite(s.score));
  }
  assert.ok(s.wave > 5);
  assert.ok(s.score > 0);
});
test("favorites sanitize stored data, and discovery filters combine without changing configured order", () => {
  assert.deepEqual(
    normalizeFavorites(
      ["snake", "snake", null, "bad", "bubble"],
      games.map((g) => g.id),
    ),
    ["snake", "bubble"],
  );
  assert.deepEqual(normalizeFavorites({}, []), []);
  const quick = filterLibrary(listedGames, { quick: "quick" });
  assert.ok(quick.length);
  assert.ok(quick.every((g) => g.minutes <= 5));
  assert.ok(
    filterLibrary(listedGames, { quick: "two" }).some(
      (g) => g.id === "tictactoe",
    ),
  );
  assert.ok(
    filterLibrary(listedGames, { quick: "two" }).every((g) => g.players === 2),
  );
  assert.deepEqual(
    filterLibrary(listedGames, { favoritesOnly: true }, ["snake"]).map(
      (g) => g.id,
    ),
    ["snake"],
  );
  assert.equal(
    filterLibrary(listedGames, {
      category: "Puzzle",
      quick: "two",
      search: "tic",
    })[0].id,
    "tictactoe",
  );
  assert.equal(
    filterLibrary(listedGames, { search: "  BUBBLE POP " })[0].id,
    "bubble",
  );
  assert.equal(
    filterLibrary(listedGames, { search: "no such title" }).length,
    0,
  );
  const original = listedGames.map((g) => g.id);
  filterLibrary(listedGames, { sort: "name" });
  assert.deepEqual(
    listedGames.map((g) => g.id),
    original,
  );
});
test("extended config validates metadata, announcement links, social links and section switches", () => {
  const value = fixtureConfig(config);
  value.announcement = {
    show: true,
    text: "Hello <players>",
    linkText: "Play",
    url: "/playpiku/",
  };
  value.socialLinks = [
    { label: "GitHub", url: "https://github.com/tanzilamd" },
  ];
  value.sections.hero = false;
  value.games[0].minutes = 2;
  assert.equal(resolveSiteConfig(games, value).listedGames[0].minutes, 2);
  for (const edit of [
    (v) => (v.games[0].minutes = 0),
    (v) => (v.games[0].mood = "loud"),
    (v) => (v.games[0].difficulty = "impossible"),
    (v) => (v.games[0].players = 3),
    (v) => (v.announcement.url = "javascript:alert(1)"),
    (v) => (v.announcement.url = "//example.com"),
    (v) => (v.socialLinks[0].url = "data:text/html,x"),
    (v) => (v.sections.hero = "false"),
    (v) => (v.library.favorites = "false"),
  ]) {
    const v = structuredClone(value);
    edit(v);
    assert.throws(() => resolveSiteConfig(games, v), /src\/site-config.js:/);
  }
});
