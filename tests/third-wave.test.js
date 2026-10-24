import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOLF_HOLES,
  golfBall,
  aimGolf,
  shootGolf,
  stepGolf,
  circleRect,
  validGolfSave,
} from "../src/engines/golf.js";
import {
  WORD_THEMES,
  WORD_MODES,
  createWordBoard,
  wordPath,
  selectedWord,
} from "../src/engines/words.js";
import {
  newStack,
  stepStack,
  dropStack,
  STACK_MODES,
} from "../src/engines/stack.js";
function rng(seed = 1) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("Mini Golf default first putt reaches the cup and cannot be shot again in motion", () => {
  const h = GOLF_HOLES[0],
    start = golfBall(h),
    aim = aimGolf(start, h.cup);
  let b = shootGolf(start, aim.angle, aim.power);
  assert.equal(shootGolf(b, 90, 100), b);
  for (let i = 0; i < 720; i++) b = stepGolf(b, h, 1 / 120);
  assert.equal(b.holed, true);
  assert.deepEqual([b.x, b.y, b.vx, b.vy], [h.cup.x, h.cup.y, 0, 0]);
  assert.equal(start.vx, 0);
});
test("every golf course starts clear and random shots settle inside the course without penetrating walls", () => {
  const random = rng(22);
  for (const hole of GOLF_HOLES) {
    assert.ok(
      !hole.walls.some(
        (w) => circleRect(hole.start, w) || circleRect(hole.cup, w, 12),
      ),
    );
    for (let n = 0; n < 35; n++) {
      let b = shootGolf(golfBall(hole), random() * 360, 5 + random() * 95);
      for (let t = 0; t < 720; t++) {
        b = stepGolf(b, hole, 1 / 120);
        assert.ok(b.x >= 26.9 && b.x <= 453.1 && b.y >= 26.9 && b.y <= 333.1);
        assert.ok(hole.walls.every((w) => !circleRect(b, w, 6.98)));
      }
      assert.equal(b.vx, 0);
      assert.equal(b.vy, 0);
    }
  }
});
test("golf walls reflect a shot and saved rounds reject invalid geometry and scores", () => {
  const hole = GOLF_HOLES[1];
  let b = { x: 215, y: 180, vx: 200, vy: 0, holed: false };
  b = stepGolf(b, hole, 1 / 120);
  b = stepGolf(b, hole, 1 / 120);
  b = stepGolf(b, hole, 1 / 120);
  b = stepGolf(b, hole, 1 / 120);
  b = stepGolf(b, hole, 1 / 120);
  b = stepGolf(b, hole, 1 / 120);
  assert.ok(b.vx < 0);
  const good = { index: 1, scores: [2], strokes: 1, ball: { x: 80, y: 270 } };
  assert.ok(validGolfSave(good));
  assert.equal(validGolfSave({ ...good, index: 6 }), false);
  assert.equal(validGolfSave({ ...good, scores: [] }), false);
  assert.equal(validGolfSave({ ...good, ball: { x: 235, y: 180 } }), false);
  assert.equal(validGolfSave({ ...good, strokes: NaN }), false);
});
test("Word Hunt always places every listed word across every topic and mode", () => {
  for (const theme of Object.keys(WORD_THEMES))
    for (const mode of Object.keys(WORD_MODES))
      for (let seed = 1; seed <= 80; seed++) {
        const p = createWordBoard(theme, mode, rng(seed));
        assert.equal(p.grid.length, 64);
        assert.equal(p.words.length, WORD_MODES[mode].count);
        assert.equal(new Set(p.words).size, p.words.length);
        assert.ok(p.grid.every((c) => /^[A-Z]$/.test(c)));
        for (const word of p.words) {
          const path = p.placements[word];
          assert.equal(path.map((i) => p.grid[i]).join(""), word);
          assert.equal(selectedWord(p, path), word);
          assert.equal(selectedWord(p, [...path].reverse()), word);
          assert.equal(selectedWord(p, path, [word]), null);
          if (mode === "easy") {
            const dx = (path[1] % 8) - (path[0] % 8),
              dy = Math.floor(path[1] / 8) - Math.floor(path[0] / 8);
            assert.ok((dx === 1 && dy === 0) || (dx === 0 && dy === 1));
          }
        }
      }
});
test("word selection disallows bent lines, gaps, out-of-range cells and row wrapping", () => {
  assert.deepEqual(wordPath(0, 18), [0, 9, 18]);
  assert.deepEqual(wordPath(18, 0), [18, 9, 0]);
  assert.deepEqual(wordPath(7, 8), []);
  assert.deepEqual(wordPath(-1, 4), []);
  assert.deepEqual(wordPath(0, 17), []);
  const p = createWordBoard();
  assert.equal(selectedWord(p, [0, 2, 4]), null);
  assert.equal(selectedWord(p, [0]), null);
});
test("Piku Stack perfect drops preserve width, recover clipped width and keep the input immutable", () => {
  let s = newStack();
  const before = JSON.stringify(s);
  s.moving.x = 110;
  const snapshot = JSON.stringify(s),
    r = dropStack(s);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(r.perfect, true);
  assert.equal(r.state.height, 1);
  assert.equal(r.state.combo, 1);
  assert.equal(r.state.blocks.at(-1).w, 180);
  s = {
    ...newStack(),
    blocks: [{ x: 150, w: 100 }],
    moving: { x: 156, w: 100, dir: 1 },
  };
  const recovered = dropStack(s);
  assert.equal(recovered.state.blocks.at(-1).w, 106);
  assert.equal(recovered.state.blocks.at(-1).x, 147);
  assert.notEqual(before, JSON.stringify(r.state));
});
test("Piku Stack trims overhangs, handles both kinds of miss and stops after game over", () => {
  let s = newStack();
  s.moving.x = 220;
  const r = dropStack(s);
  assert.equal(r.perfect, false);
  assert.equal(r.state.blocks.at(-1).w, 70);
  assert.equal(
    r.cuts.reduce((a, c) => a + c.w, 0),
    110,
  );
  const missed = dropStack(r.state).state;
  assert.equal(missed.dead, true);
  assert.equal(stepStack(missed, 0.02), missed);
  assert.equal(dropStack(missed).state, missed);
  s = { ...newStack(), moving: { x: 0, w: 40, dir: 1 } };
  assert.equal(dropStack(s).state.dead, true);
});
test("stack blocks remain inside the stage at high speed in both modes and even with narrow blocks", () => {
  for (const mode of Object.keys(STACK_MODES))
    for (const width of [1, 12, 70, 180]) {
      let s = {
        ...newStack(mode),
        height: 200,
        moving: { x: 0, w: width, dir: 1 },
      };
      for (let i = 0; i < 2000; i++) {
        s = stepStack(s, 0.04);
        assert.ok(s.moving.x >= 0 && s.moving.x + s.moving.w <= 400);
      }
    }
});
test("all six handcrafted golf holes are solvable within their advertised par", () => {
  const plans = [
    [],
    [{ x: 350, y: 300 }],
    [
      { x: 110, y: 95 },
      { x: 380, y: 95 },
    ],
    [
      { x: 240, y: 280 },
      { x: 240, y: 100 },
    ],
    [],
    [
      { x: 150, y: 325 },
      { x: 330, y: 325 },
    ],
  ];
  for (let index = 0; index < GOLF_HOLES.length; index++) {
    const hole = GOLF_HOLES[index];
    let ball = golfBall(hole),
      shots = 0;
    for (const target of [...plans[index], hole.cup, hole.cup]) {
      if (ball.holed) break;
      const aim = aimGolf(ball, target),
        isCup = target === hole.cup,
        power = isCup
          ? aim.power
          : Math.min(
              100,
              ((Math.hypot(target.x - ball.x, target.y - ball.y) * 1.4 + 4) /
                440) *
                100,
            );
      ball = shootGolf(ball, aim.angle, power);
      shots++;
      for (let i = 0; i < 720; i++) ball = stepGolf(ball, hole, 1 / 120);
    }
    assert.ok(ball.holed, `Hole ${index + 1} must be reachable`);
    assert.ok(shots <= hole.par, `Hole ${index + 1} exceeded par`);
  }
});
