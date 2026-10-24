import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RALLY_TRACKS,
  newRally,
  stepRally,
  resetRally,
  wrapAngle,
} from "../src/engines/rally.js";
import {
  DEFENSE_MAPS,
  TOWER_TYPES,
  newDefense,
  buildable,
  buildTower,
  upgradeTower,
  sellTower,
  startDefenseWave,
  stepDefense,
  towerStats,
  enemyPosition,
} from "../src/engines/defense.js";
test("Rally steering, braking and returning to track are bounded and preserve checkpoint order", () => {
  let s = newRally("meadow", "relaxed");
  for (let i = 0; i < 200; i++) s = stepRally(s, { steer: 0 }, 1 / 120);
  assert.ok(s.speed > 100);
  const braking = stepRally(s, { steer: 1, brake: true }, 1 / 120);
  assert.ok(braking.speed < s.speed);
  assert.ok(braking.angle > s.angle);
  s = { ...s, x: 10, y: 10, nextCheckpoint: 3, laps: 1 };
  const reset = resetRally(s);
  assert.equal(reset.nextCheckpoint, 3);
  assert.equal(reset.laps, 1);
  assert.equal(reset.penalty, 3);
  assert.equal(resetRally(newRally()).penalty, 0);
  assert.ok(reset.x >= 14 && reset.x <= 626);
});
test("Rally cannot count a lap by idling at the start or driving checkpoints in reverse", () => {
  let s = newRally("meadow", "relaxed");
  for (let i = 0; i < 500; i++) s = stepRally(s, { steer: 0 }, 1 / 120);
  assert.equal(s.laps, 0);
  const p = RALLY_TRACKS.meadow.points[1];
  s = {
    ...newRally("meadow", "relaxed"),
    x: p.x,
    y: p.y,
    vx: -80,
    vy: -20,
    angle: -3,
    speed: 80,
  };
  assert.equal(stepRally(s, {}, 1 / 120).nextCheckpoint, 1);
});
test("all Rally tracks support completed three-lap races using ordinary steering and braking", () => {
  for (const id of Object.keys(RALLY_TRACKS))
    for (const mode of ["relaxed", "classic"]) {
      let s = newRally(id, mode);
      for (let i = 0; i < 120 * 240 && !s.finished; i++) {
        const p = RALLY_TRACKS[id].points[s.nextCheckpoint],
          error = wrapAngle(Math.atan2(p.y - s.y, p.x - s.x) - s.angle);
        s = stepRally(
          s,
          {
            steer: Math.max(-1, Math.min(1, error * 3)),
            brake: Math.abs(error) > 0.35,
          },
          1 / 120,
        );
      }
      assert.ok(
        s.finished,
        `${id} ${mode}: ${s.laps} laps, checkpoint ${s.nextCheckpoint}`,
      );
      assert.equal(s.laps, 3);
      assert.ok(s.time > 10);
      assert.equal(stepRally(s, {}, 1 / 120), s);
    }
});
test("defense building validates cells, gold and tower occupancy without mutating the input", () => {
  const original = newDefense(),
    snapshot = JSON.stringify(original);
  const path = DEFENSE_MAPS.meadow.path.find((p) => p.x >= 0 && p.x < 12),
    pathCell = path.y * 12 + path.x;
  assert.equal(buildTower(original, "rapid", pathCell), null);
  assert.equal(buildTower(original, "unknown", 0), null);
  assert.equal(buildTower(original, "rapid", -1), null);
  const cell = Array.from({ length: 96 }, (_, i) => i).find((i) =>
      buildable("meadow", i),
    ),
    built = buildTower(original, "rapid", cell);
  assert.equal(built.money, 100);
  assert.equal(buildTower(built, "rapid", cell), null);
  assert.equal(JSON.stringify(original), snapshot);
});
test("defense upgrades cap at level three, selling refunds investment once and insufficient funds never go negative", () => {
  let s = buildTower({ ...newDefense(), money: 400 }, "rapid", 0);
  const id = s.towers[0].id;
  s = upgradeTower(s, id);
  s = upgradeTower(s, id);
  assert.equal(s.towers[0].level, 3);
  assert.equal(upgradeTower(s, id), null);
  const refund = Math.floor(s.towers[0].spent * 0.7),
    money = s.money;
  s = sellTower(s, id);
  assert.equal(s.money, money + refund);
  assert.equal(sellTower(s, id), null);
  assert.equal(buildTower({ ...s, money: 0 }, "cannon", 1), null);
});
test("wave starts cannot be duplicated; empty defenses leak correctly and freeze after defeat", () => {
  let s = startDefenseWave(newDefense());
  assert.equal(startDefenseWave(s), s);
  for (let i = 0; i < 60 * 300 && s.status === "wave"; i++)
    s = stepDefense(s, 1 / 60);
  assert.equal(s.status, "build");
  assert.equal(s.lives, 15);
  s = startDefenseWave({ ...s, lives: 1 });
  for (let i = 0; i < 60 * 100 && s.status === "wave"; i++)
    s = stepDefense(s, 1 / 60);
  assert.equal(s.status, "lost");
  assert.equal(s.lives, 0);
  assert.equal(stepDefense(s, 1 / 60), s);
  assert.equal(buildTower(s, "rapid", 0), null);
});
test("Frost slows without multiplying slow effects, Cannon splash kills award gold once", () => {
  const base = newDefense(),
    cell = 40;
  let s = buildTower({ ...base, money: 500 }, "frost", cell);
  s = {
    ...s,
    status: "wave",
    wave: 1,
    queue: [{ hp: 999, maxHp: 999, speed: 0, armor: 0, bounty: 10 }],
    spawnIn: 999,
    enemies: [
      {
        id: 50,
        hp: 100,
        maxHp: 100,
        speed: 40,
        armor: 0,
        distance: 350,
        slowUntil: 0,
        bounty: 10,
      },
    ],
  };
  let slowed = false;
  for (let i = 0; i < 120; i++) {
    s = stepDefense(s, 1 / 60);
    slowed ||= s.enemies.some((e) => e.slowUntil > s.time);
  }
  assert.ok(slowed);
  let cannon = buildTower({ ...base, money: 500 }, "cannon", cell);
  cannon = {
    ...cannon,
    status: "wave",
    wave: 1,
    queue: [{ hp: 99, maxHp: 99, speed: 0, armor: 0, bounty: 10 }],
    spawnIn: 999,
    enemies: [350, 360].map((d, i) => ({
      id: 50 + i,
      hp: 10,
      maxHp: 10,
      speed: 0,
      armor: 0,
      distance: d,
      slowUntil: 0,
      bounty: 10,
    })),
  };
  const money = cannon.money;
  cannon = stepDefense(cannon, 1 / 60);
  assert.equal(cannon.kills, 2);
  assert.equal(cannon.money, money + 20);
  assert.equal(stepDefense(cannon, 1 / 60).money, money + 20);
});
test("both maps can be defended through wave ten with a mixed tower strategy", () => {
  for (const map of Object.keys(DEFENSE_MAPS)) {
    let s = newDefense(map);
    const ranked = Array.from({ length: 96 }, (_, cell) => cell)
      .filter((cell) => buildable(map, cell))
      .map((cell) => ({
        cell,
        coverage: DEFENSE_MAPS[map].path.filter(
          (p) =>
            Math.hypot(
              ((cell % 12) - p.x) * 50,
              (Math.floor(cell / 12) - p.y) * 50,
            ) < 110,
        ).length,
      }))
      .sort((a, b) => b.coverage - a.coverage);
    for (let wave = 0; wave < 10; wave++) {
      let changed = true;
      while (changed) {
        changed = false;
        const upgrade = s.towers
          .filter(
            (t) =>
              towerStats(t).upgradeCost !== null &&
              towerStats(t).upgradeCost <= s.money,
          )
          .sort((a, b) => a.level - b.level)[0];
        if (upgrade && s.towers.length >= 4) {
          s = upgradeTower(s, upgrade.id);
          changed = true;
          continue;
        }
        const cell = ranked.find(
            (p) => !s.towers.some((t) => t.cell === p.cell),
          )?.cell,
          type = ["rapid", "cannon", "frost", "rapid", "cannon", "rapid"][
            s.towers.length % 6
          ];
        if (s.towers.length < 6 && cell !== undefined) {
          const next = buildTower(s, type, cell);
          if (next) {
            s = next;
            changed = true;
            continue;
          }
        }
        if (upgrade) {
          s = upgradeTower(s, upgrade.id);
          changed = true;
        }
      }
      s = startDefenseWave(s);
      for (let i = 0; i < 60 * 90 && s.status === "wave"; i++)
        s = stepDefense(s, 1 / 60);
      assert.notEqual(s.status, "lost", `${map} lost wave ${s.wave}`);
      assert.ok(s.money >= 0);
      assert.notEqual(s.status, "wave");
    }
    assert.equal(s.status, "won", map);
    assert.ok(s.lives > 0);
  }
});
