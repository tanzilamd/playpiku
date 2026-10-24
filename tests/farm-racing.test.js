import test from "node:test";
import assert from "node:assert/strict";
import {
  HARVEST_LEVELS,
  newHarvest,
  harvestMatches,
  harvestHint,
  harvestSwap,
  shuffleHarvest,
  restoreHarvest,
  harvestStars,
} from "../src/engines/harvest.js";
import {
  newTraffic,
  stepTraffic,
  trafficLane,
  trafficGarage,
  buyTrafficCar,
} from "../src/engines/traffic.js";
import {
  MOTO_TRACKS,
  newMoto,
  stepMoto,
  resetMoto,
  motoGround,
  motoMedal,
  validMotoGhost,
  motoGhostAt,
} from "../src/engines/moto.js";

test("all 24 harvest gardens start without matches and with a legal move over many seeds", () => {
  for (const level of HARVEST_LEVELS)
    for (let seed = 0; seed < 30; seed++) {
      const s = newHarvest(level.id, "normal", seed);
      assert.equal(s.board.length, 49);
      assert.equal(harvestMatches(s.board).length, 0);
      assert.ok(harvestHint(s));
      assert.equal(s.grass.filter(Boolean).length, level.patches);
      assert.equal(
        s.grass.reduce((a, b) => a + b, 0),
        level.patches * level.layers,
      );
      assert.ok(restoreHarvest(s));
    }
});
test("harvest rejects wrapped, identical and unproductive swaps without consuming a move or changing input", () => {
  const s = newHarvest(1, "normal", 1),
    before = JSON.stringify(s);
  for (const pair of [
    [6, 7],
    [0, 0],
    [-1, 0],
    [1, 49],
  ])
    assert.equal(harvestSwap(s, ...pair), null);
  let unproductive;
  for (let i = 0; i < 48; i++)
    if (i % 7 < 6 && !harvestSwap(s, i, i + 1)) {
      unproductive = [i, i + 1];
      break;
    }
  assert.ok(unproductive);
  assert.equal(JSON.stringify(s), before);
  const next = harvestSwap(s, 1, 8);
  assert.ok(next);
  assert.equal(next.world.moves, s.moves - 1);
  assert.ok(next.world.collected[0] >= 3);
  assert.equal(JSON.stringify(s), before);
});
test("harvest four and five matches create line and color specials; cascades settle and patches clear once per hit", () => {
  for (const length of [4, 5]) {
    const s = newHarvest(20, "relaxed", 4);
    // Swap row 2's strawberry into the gap in row 1.
    const row = length === 4 ? [0, 0, 1, 0, 2, 3, 4] : [0, 0, 1, 0, 0, 3, 4];
    row.forEach((type, i) => (s.board[i] = { type, special: null }));
    s.board[9] = { type: 0, special: null };
    s.grass[0] = 2;
    const next = harvestSwap(s, 2, 9);
    assert.ok(next);
    assert.ok(
      next.frames.some((f) =>
        f.board.some((c) => c.special === (length === 5 ? "color" : "row")),
      ),
    );
    assert.ok(next.world.collected[0] >= length);
    assert.ok(next.world.grass[0] <= 1);
    assert.equal(harvestMatches(next.world.board).length, 0);
    assert.ok(harvestHint(next.world));
  }
});
test("harvest color swap clears the selected color, tracks victory before move exhaustion, and freezes terminal boards", () => {
  const s = newHarvest(1, "normal", 1);
  s.board[1].special = "color";
  s.moves = 1;
  s.collected[0] = 9;
  const next = harvestSwap(s, 1, 8).world;
  assert.equal(next.status, "won");
  assert.equal(next.moves, 0);
  assert.equal(harvestStars(next), 1);
  assert.equal(harvestSwap(next, 0, 1), null);
  assert.ok(restoreHarvest(next));
});
test("harvest relaxed never runs out of moves; normal defeat, one free shuffle and damaged saves behave safely", () => {
  let s = newHarvest(1, "relaxed", 3);
  const moves = s.moves;
  for (let i = 0; i < 30 && s.status === "playing"; i++)
    s = harvestSwap(s, ...harvestHint(s)).world;
  assert.equal(s.status, "won");
  assert.equal(s.moves, moves);
  assert.equal(harvestStars(s), 0);
  const start = newHarvest(24, "normal", 5);
  start.moves = 1;
  const lost = harvestSwap(start, ...harvestHint(start)).world;
  assert.equal(lost.status, "lost");
  const shuffled = shuffleHarvest(start);
  assert.equal(shuffled.moves, 1);
  assert.equal(shuffled.shuffles, 0);
  assert.equal(shuffleHarvest(shuffled), null);
  for (const bad of [
    null,
    {},
    { ...start, board: [] },
    { ...start, grass: [0] },
    { ...start, collected: [0] },
    { ...start, moves: -1 },
    { ...start, seed: NaN },
    { ...start, level: 25 },
  ])
    assert.equal(restoreHarvest(bad), null);
});
test("harvest legal play preserves valid saves and finite scores over long randomized relaxed games", () => {
  for (let level = 1; level <= 24; level++) {
    let s = newHarvest(level, "relaxed", level * 99);
    for (let turn = 0; turn < 100 && s.status === "playing"; turn++) {
      s = harvestSwap(s, ...harvestHint(s)).world;
      assert.ok(Number.isFinite(s.score));
      assert.ok(restoreHarvest(s));
      assert.equal(harvestMatches(s.board).length, 0);
    }
  }
});
function safeDrive(s, controls = {}) {
  const next = s.rows.find((row) => row.at - s.distance > 9);
  if (next && next.at - s.distance < 65) {
    while (s.lane !== next.free)
      s = trafficLane(s, Math.sign(next.free - s.lane));
  }
  return stepTraffic(s, 1 / 60, controls);
}
test("traffic rows always retain a reachable lane and complete 1,500m challenges across 100 seeds with brake and nitro", () => {
  for (let seed = 0; seed < 100; seed++) {
    let s = newTraffic("challenge", seed);
    for (let i = 0; i < 60 * 100 && s.status === "playing"; i++) {
      for (const row of s.rows) {
        assert.ok(!row.blocked.includes(row.free));
        assert.ok(row.blocked.length <= 2);
      }
      s = safeDrive(s, { boost: i % 900 < 200, brake: i % 700 > 650 });
    }
    assert.equal(s.status, "won", `seed ${seed}`);
    assert.equal(s.distance, 1500);
    assert.ok(s.coins > 0);
    assert.ok(s.near > 0);
    assert.ok(s.score > 1500);
  }
});
test("traffic collision detects a crossed car, coins and close passes cannot score twice, and terminal state freezes", () => {
  let s = newTraffic("endless", 1);
  s.distance = 100;
  s.speed = 55;
  s.x = s.lane = 1;
  s.rows = [{ id: 0, at: 101, free: 0, blocked: [1], coin: true, near: false }];
  const crashed = stepTraffic(s, 0.05);
  assert.equal(crashed.status, "crashed");
  assert.equal(stepTraffic(crashed, 0.05), crashed);
  assert.equal(s.status, "playing");
  s = newTraffic("endless", 2);
  s.distance = 90;
  s.speed = 30;
  s.x = s.lane = 0;
  s.rows = [
    { id: 0, at: 110, free: 0, blocked: [1], coin: false, near: false },
  ];
  for (let i = 0; i < 100; i++) s = stepTraffic(s, 1 / 60);
  assert.equal(s.coins, 1);
  assert.equal(s.near, 1);
});
test("traffic steering stays on road, brake slows, nitro drains and only release recharges it", () => {
  let s = newTraffic();
  for (let i = 0; i < 10; i++) s = trafficLane(s, -1);
  assert.equal(s.lane, 0);
  for (let i = 0; i < 10; i++) s = trafficLane(s, 1);
  assert.equal(s.lane, 2);
  s.rows = [];
  s.nextAt = 10000;
  for (let i = 0; i < 360; i++) s = stepTraffic(s, 1 / 60, { boost: true });
  assert.equal(s.energy, 0);
  const speed = s.speed;
  s = stepTraffic(s, 1 / 60, { brake: true });
  assert.ok(s.speed < speed);
  assert.ok(s.energy > 0);
  assert.equal(stepTraffic(s, NaN), s);
  assert.equal(stepTraffic(s, -1), s);
});
test("traffic garage rejects broken data, insufficient funds and duplicate purchases without spending twice", () => {
  assert.deepEqual(trafficGarage({ bank: -5, owned: {} }), {
    bank: 0,
    owned: ["mint"],
  });
  assert.equal(buyTrafficCar({ bank: 20, owned: [] }, "coral"), null);
  const input = { bank: 120, owned: ["mint"] },
    next = buyTrafficCar(input, "coral");
  assert.equal(next.bank, 70);
  assert.equal(input.bank, 120);
  assert.equal(buyTrafficCar(next, "coral"), null);
  assert.equal(buyTrafficCar(next, "missing"), null);
});
test("all twelve Moto trails have smooth continuous terrain and can finish using ordinary acceleration", () => {
  for (const t of MOTO_TRACKS) {
    for (let x = 0; x < t.length; x += 5)
      assert.ok(Math.abs(motoGround(t, x + 1) - motoGround(t, x)) < 3);
    let s = newMoto(t.id),
      air = 0;
    for (let i = 0; i < 120 * 60 && s.status === "playing"; i++) {
      s = stepMoto(s, 1 / 120, { gas: true });
      if (!s.grounded) air++;
      assert.ok(Number.isFinite(s.angle) && Number.isFinite(s.y));
    }
    assert.equal(s.status, "won", t.name);
    assert.ok(air > 0, t.name + " has jumps");
    assert.ok(["Gold", "Silver", "Bronze"].includes(motoMedal(s)));
    assert.equal(stepMoto(s, 1 / 60), s);
  }
});
test("Moto leaning can cause a landing crash; checkpoints return safely and add exactly three seconds", () => {
  let s = newMoto();
  for (let i = 0; i < 120 * 60 && s.status === "playing"; i++)
    s = stepMoto(s, 1 / 120, { gas: true, lean: 1 });
  assert.equal(s.status, "crashed");
  assert.ok(s.checkpoint >= 400);
  const before = JSON.stringify(s),
    reset = resetMoto(s);
  assert.equal(reset.status, "playing");
  assert.equal(reset.x, s.checkpoint);
  assert.equal(reset.penalty, s.penalty + 3);
  assert.equal(reset.vx, 0);
  assert.equal(reset.deaths, s.deaths + 1);
  assert.equal(JSON.stringify(s), before);
  for (let i = 0; i < 120 * 60 && reset.status === "playing"; i++) {
    const next = stepMoto(reset, 1 / 120, { gas: true });
    Object.assign(reset, next);
  }
  assert.equal(reset.status, "won");
});
test("Moto brake reduces speed and idle bikes do not drift; invalid steps are inert", () => {
  let s = newMoto();
  for (let i = 0; i < 120; i++) s = stepMoto(s, 1 / 120);
  assert.equal(s.x, 40);
  for (let i = 0; i < 120; i++) s = stepMoto(s, 1 / 120, { gas: true });
  const speed = s.vx;
  for (let i = 0; i < 30; i++) s = stepMoto(s, 1 / 120, { brake: true });
  assert.ok(s.vx < speed);
  assert.equal(stepMoto(s, Infinity), s);
  assert.equal(stepMoto(s, 0), s);
});
test("Moto ghosts validate track, frame bounds and time ordering, then interpolate across angle wrap", () => {
  const value = {
    version: 1,
    track: "trail-1",
    frames: [
      [0, 40, 124, 3.1],
      [1, 100, 130, -3.1],
    ],
  };
  assert.equal(validMotoGhost(value, "trail-1"), value);
  const p = motoGhostAt(value, 0.5);
  assert.equal(p.x, 70);
  assert.ok(Math.abs(p.angle - Math.PI) < 0.05);
  assert.equal(motoGhostAt(value, 2), null);
  for (const bad of [
    { ...value, track: "trail-2" },
    {
      ...value,
      frames: [
        [1, 0, 0, 0],
        [1, 1, 1, 1],
      ],
    },
    {
      ...value,
      frames: [
        [0, 40, NaN, 0],
        [1, 2, 3, 0],
      ],
    },
    {
      ...value,
      frames: [
        [0, -1, 0, 0],
        [1, 1, 1, 1],
      ],
    },
  ])
    assert.equal(validMotoGhost(bad, "trail-1"), null);
});

test("each Harvest Adventure level has a winning route using legal moves, its free shuffle and the authored move budget", () => {
  function play(input, history = []) {
    let s = input;
    while (s.status === "playing") {
      history.push(s);
      const config = HARVEST_LEVELS[s.level - 1];
      let best = null,
        bestValue = -Infinity;
      for (let a = 0; a < 49; a++)
        for (const b of [a % 7 < 6 ? a + 1 : -1, a + 7]) {
          const result = harvestSwap(s, a, b);
          if (!result) continue;
          const n = result.world;
          let value = config.targets.reduce(
            (sum, target, t) =>
              sum +
              (target
                ? ((Math.min(target, n.collected[t]) -
                    Math.min(target, s.collected[t])) /
                    target) *
                  100
                : 0),
            0,
          );
          value +=
            (s.grass.reduce((a, b) => a + b, 0) -
              n.grass.reduce((a, b) => a + b, 0)) *
              5 +
            (n.score - s.score) * 0.001;
          if (value > bestValue) {
            bestValue = value;
            best = n;
          }
        }
      assert.ok(best);
      s = best;
    }
    return s;
  }
  for (const config of HARVEST_LEVELS) {
    const history = [];
    let result = play(
      newHarvest(config.id, "normal", 777 + config.id),
      history,
    );
    // Try the level's actual one-use booster at earlier legal positions.
    if (result.status !== "won")
      for (const position of history.reverse()) {
        result = play(shuffleHarvest(position));
        if (result.status === "won") break;
      }
    assert.equal(result.status, "won", `Adventure level ${config.id}`);
  }
});
