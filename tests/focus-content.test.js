import test from "node:test";
import assert from "node:assert/strict";
import {
  GOLF_COURSES,
  WOODLAND_HOLES,
  GOLF_HOLES,
  golfBall,
  aimGolf,
  shootGolf,
  stepGolf,
  circleRect,
  validGolfSave,
} from "../src/engines/golf.js";
import {
  newBubble,
  restoreBubble,
  BUBBLE_LEVELS,
  bubbleNeighbors,
} from "../src/engines/bubble.js";
import {
  DEFENSE_MAPS,
  pathGeometry,
  buildable,
} from "../src/engines/defense.js";
import {
  newMeteor,
  stepMeteor,
  METEOR_GUARDIANS,
} from "../src/engines/meteor.js";

test("new golf holes have clear starts/cups and legal shots settle without crossing walls", () => {
  let seed = 59;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (const hole of WOODLAND_HOLES) {
    assert.ok(
      hole.walls.every(
        (w) => !circleRect(hole.start, w) && !circleRect(hole.cup, w, 12),
      ),
    );
    for (let n = 0; n < 25; n++) {
      let b = shootGolf(golfBall(hole), random() * 360, 5 + random() * 95);
      for (let i = 0; i < 720; i++) {
        b = stepGolf(b, hole, 1 / 120);
        assert.ok(b.x >= 26.9 && b.x <= 453.1 && b.y >= 26.9 && b.y <= 333.1);
        assert.ok(hole.walls.every((w) => !circleRect(b, w, 6.98)));
      }
      assert.equal(b.vx, 0);
      assert.equal(b.vy, 0);
    }
  }
});
test("all six Woodland holes can be completed within par using legal shots", () => {
  const plans = [
    [{ x: 130, y: 90 }],
    [
      { x: 95, y: 285 },
      { x: 250, y: 285 },
      { x: 250, y: 75 },
      { x: 410, y: 75 },
    ],
    [
      { x: 100, y: 90 },
      { x: 400, y: 90 },
    ],
    [
      { x: 440, y: 85 },
      { x: 440, y: 285 },
    ],
    [],
    [
      { x: 100, y: 325 },
      { x: 390, y: 325 },
    ],
  ];
  for (let i = 0; i < WOODLAND_HOLES.length; i++) {
    const h = WOODLAND_HOLES[i];
    let b = golfBall(h),
      shots = 0;
    for (const target of [...plans[i], h.cup, h.cup]) {
      if (b.holed) break;
      const aim = aimGolf(b, target),
        power =
          target === h.cup
            ? aim.power
            : Math.min(
                100,
                ((Math.hypot(target.x - b.x, target.y - b.y) * 1.4 + 4) / 440) *
                  100,
              );
      b = shootGolf(b, aim.angle, power);
      shots++;
      for (let j = 0; j < 720; j++) b = stepGolf(b, h, 1 / 120);
    }
    assert.ok(b.holed, h.name);
    assert.ok(shots <= h.par, h.name);
  }
});
test("old golf rounds and records retain their course while Woodland has independent keys", () => {
  assert.equal(GOLF_COURSES.meadow.holes, GOLF_HOLES);
  assert.equal(GOLF_COURSES.meadow.recordKey, "golf");
  assert.equal(GOLF_COURSES.meadow.saveKey, "golf-save");
  assert.notEqual(
    GOLF_COURSES.woodland.recordKey,
    GOLF_COURSES.meadow.recordKey,
  );
  const legacy = { index: 0, scores: [], strokes: 1, ball: { x: 90, y: 260 } };
  assert.ok(validGolfSave(legacy));
  assert.ok(
    validGolfSave({
      ...legacy,
      courseId: "woodland",
      ball: { ...WOODLAND_HOLES[0].start },
    }),
  );
  assert.equal(validGolfSave({ ...legacy, courseId: "unknown" }), false);
  assert.equal(
    validGolfSave({
      ...legacy,
      courseId: "woodland",
      ball: { x: 230, y: 200 },
    }),
    false,
  );
});
test("the new bubble layouts are distinct, anchored and can restore legacy twelve-level saves", () => {
  assert.equal(BUBBLE_LEVELS, 24);
  const snapshots = new Set();
  for (let level = 13; level <= 24; level++) {
    const s = newBubble(level, () => 0.4);
    assert.ok(restoreBubble(s), `Garden ${level} must start fully anchored`);
    snapshots.add(JSON.stringify(s.board));
    assert.ok(s.board.every((b) => b.row < 10));
    assert.ok(s.board.filter((b) => b.row === 0).length);
  }
  assert.ok(snapshots.size >= 10);
  const old = newBubble(12, () => 0.4);
  assert.equal(restoreBubble(old).level, 12);
  assert.equal(newBubble(999).level, 24);
});
test("all defense maps have contiguous unique paths, usable build cells and finite geometry", () => {
  assert.equal(Object.keys(DEFENSE_MAPS).length, 4);
  for (const [id, map] of Object.entries(DEFENSE_MAPS)) {
    assert.equal(
      new Set(map.path.map((p) => `${p.x}:${p.y}`)).size,
      map.path.length,
    );
    for (let i = 1; i < map.path.length; i++) {
      const a = map.path[i - 1],
        b = map.path[i];
      assert.equal(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 1);
      assert.ok(b.y >= 0 && b.y < 8);
    }
    assert.equal(map.path[0].x, -1);
    assert.equal(map.path.at(-1).x, 12);
    assert.ok(pathGeometry(id).total > 900);
    assert.ok(
      Array.from({ length: 96 }, (_, i) => i).filter((i) => buildable(id, i))
        .length > 55,
    );
  }
});
test("three distinct guardians rotate, telegraph aimed volleys and leave dodgeable fan gaps", () => {
  assert.equal(METEOR_GUARDIANS.length, 3);
  const signatures = [];
  for (const wave of [3, 6, 9, 12]) {
    const s = newMeteor();
    s.wave = wave;
    s.spawned = 8;
    stepMeteor(s, 0.02, {}, () => 0.5);
    assert.equal(s.boss.variant, (wave / 3 - 1) % 3);
    s.boss.y = 100;
    s.boss.fire = 0.5;
    s.invincible = 5;
    s.shotTimer = 10;
    stepMeteor(s, 0.02, {}, () => 0.5);
    if (wave === 6) {
      assert.ok(s.boss.warning);
      const before = { ...s.boss.warning };
      s.ship.x = 40;
      stepMeteor(s, 0.02, {}, () => 0.5);
      assert.deepEqual(s.boss.warning, before);
    }
    s.boss.fire = 0.001;
    stepMeteor(s, 0.02, {}, () => 0.5);
    assert.equal(s.hostile.length, wave === 9 ? 5 : 3);
    assert.ok(s.hostile.every((b) => Number.isFinite(b.vx) && b.vy > 0));
    if (wave <= 9)
      signatures.push(s.hostile.map((b) => Math.round(b.vx)).join());
    assert.equal(s.boss.warning, null);
    s.boss.hp = s.boss.maxHp / 2;
    stepMeteor(s, 0.02, {}, () => 0.5);
    assert.equal(s.pickups.filter((p) => p.type === "power").length, 1);
    stepMeteor(s, 0.02, {}, () => 0.5);
    assert.equal(s.pickups.filter((p) => p.type === "power").length, 1);
  }
  assert.equal(new Set(signatures).size, 3);
});
