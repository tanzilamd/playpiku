import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SHAPES,
  fitsBlock,
  placeBlock,
  makeTray,
  hasBlockMove,
  validBlockSave,
} from "../src/engines/blocks.js";
import {
  MINE_LEVELS,
  neighbors,
  createMinefield,
  revealMines,
  chordTargets,
} from "../src/engines/mines.js";
import {
  DASH,
  newDash,
  jumpDash,
  stepDash,
  dashScore,
} from "../src/engines/dash.js";
function rng(seed = 1) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function field(size, mines) {
  return Array.from({ length: size * size }, (_, i) => ({
    mine: mines.includes(i),
    number: neighbors(i, size).filter((n) => mines.includes(n)).length,
    revealed: false,
    flagged: false,
  }));
}
test("blocks reject overlap and edges without consuming or mutating the board", () => {
  const b = Array(64).fill(0);
  b[9] = 1;
  const copy = [...b];
  assert.equal(placeBlock(b, SHAPES[1], 7, 0), null);
  assert.equal(placeBlock(b, SHAPES[2], 0, 7), null);
  assert.equal(placeBlock(b, SHAPES[0], 1, 1), null);
  assert.equal(fitsBlock(b, SHAPES[0], -1, 0), false);
  assert.deepEqual(b, copy);
});
test("blocks clear intersecting row and column simultaneously and count each cell once", () => {
  const b = Array(64).fill(0);
  for (let i = 1; i < 8; i++) {
    b[i] = 1;
    b[i * 8] = 1;
  }
  const r = placeBlock(b, SHAPES[0], 0, 0);
  assert.equal(r.lines, 2);
  assert.equal(r.cleared.length, 15);
  assert.equal(r.board.filter(Boolean).length, 0);
  assert.equal(r.points, 161);
  assert.equal(r.combo, 1);
});
test("block combo advances only on consecutive clearing moves and caps at five", () => {
  const b = Array(64).fill(0);
  for (let i = 1; i < 8; i++) b[i] = 1;
  assert.equal(placeBlock(b, SHAPES[0], 0, 0, 4).combo, 5);
  assert.equal(placeBlock(b, SHAPES[0], 0, 0, 5).points, 401);
  assert.equal(placeBlock(Array(64).fill(0), SHAPES[0], 2, 2, 4).combo, 0);
});
test("new trays always offer a playable piece when any space remains", () => {
  const random = rng(32);
  for (let i = 0; i < 300; i++) {
    const b = Array.from({ length: 64 }, () => (random() < 0.8 ? 1 : 0));
    b[i % 64] = 0;
    const tray = makeTray(b, random);
    assert.equal(tray.length, 3);
    assert.ok(hasBlockMove(b, tray));
  }
  assert.deepEqual(makeTray(Array(64).fill(1)), []);
  assert.equal(hasBlockMove(Array(64).fill(1), [0, 1, 2]), false);
});
test("block saves reject corrupt shape ids, scores and board dimensions", () => {
  const s = {
    board: Array(64).fill(0),
    tray: [0, null, 3],
    score: 40,
    combo: 1,
  };
  assert.ok(validBlockSave(s));
  for (const change of [
    { tray: [99, 0, 1] },
    { score: NaN },
    { board: [0] },
    { combo: 6 },
  ])
    assert.equal(validBlockSave({ ...s, ...change }), false);
});
test("Minesweeper keeps the first cell and every neighbor safe at every difficulty and opening", () => {
  const random = rng(4);
  for (const { size, mines } of Object.values(MINE_LEVELS))
    for (let i = 0; i < size * size; i++) {
      const cells = createMinefield(size, mines, i, random);
      assert.equal(cells.filter((c) => c.mine).length, mines);
      for (const safe of [i, ...neighbors(i, size)])
        assert.equal(cells[safe].mine, false);
      for (let j = 0; j < cells.length; j++)
        assert.equal(
          cells[j].number,
          neighbors(j, size).filter((k) => cells[k].mine).length,
        );
    }
  assert.deepEqual(neighbors(0, 3), [1, 3, 4]);
});
test("Minesweeper flood reveal respects flags and only wins after all safe squares open", () => {
  const cells = field(4, [15]);
  cells[0].flagged = true;
  const r = revealMines(cells, 4, [1]);
  assert.equal(r.exploded, null);
  assert.equal(r.cells[0].revealed, false);
  assert.equal(r.cells[15].revealed, false);
  assert.equal(r.won, false);
  r.cells[0].flagged = false;
  assert.equal(revealMines(r.cells, 4, [0]).won, true);
  assert.equal(cells[1].revealed, false);
});
test("Minesweeper correct chording wins, while incorrect flags can detonate a mine", () => {
  let cells = field(3, [0, 8]);
  cells[4].revealed = true;
  cells[0].flagged = true;
  cells[8].flagged = true;
  assert.equal(revealMines(cells, 3, chordTargets(cells, 3, 4)).won, true);
  cells = field(3, [0, 8]);
  cells[4].revealed = true;
  cells[1].flagged = true;
  assert.deepEqual(chordTargets(cells, 3, 4), []);
  cells[2].flagged = true;
  assert.equal(revealMines(cells, 3, chordTargets(cells, 3, 4)).exploded, 0);
});
test("Piku Dash allows exactly two jumps and replenishes them on landing", () => {
  let s = jumpDash(newDash());
  assert.equal(s.jumps, 1);
  assert.ok(s.vy < 0);
  s = jumpDash(s);
  assert.equal(s.jumps, 2);
  assert.equal(jumpDash(s), s);
  s.spawnIn = 100;
  for (let i = 0; i < 200; i++) s = stepDash(s, 1 / 120);
  assert.equal(s.jumps, 0);
  assert.equal(s.y, DASH.ground - DASH.h);
  assert.equal(s.vy, 0);
});
test("Piku Dash collision stops the run and coins score exactly once", () => {
  let s = newDash();
  s.obstacles = [{ x: 90, w: 30, h: 40, passed: false }];
  assert.equal(stepDash(s, 1 / 120).dead, true);
  s = newDash();
  s.coins = [{ x: 95, y: 225, collected: false }];
  s = stepDash(s, 1 / 120);
  assert.equal(s.collected, 1);
  assert.equal(dashScore(s), 25);
  assert.equal(stepDash(s, 1 / 120).collected, 1);
});
test("Piku Dash remains fair through two minutes of accelerating obstacles using single timed jumps", () => {
  const random = rng(123);
  let s = newDash();
  for (let i = 0; i < 120 * 120; i++) {
    if (
      s.jumps === 0 &&
      s.obstacles.some((o) => o.x < DASH.x + 80 && o.x + o.w > DASH.x)
    )
      s = jumpDash(s);
    s = stepDash(s, 1 / 120, random);
    assert.equal(s.dead, false, `Collision at ${s.time.toFixed(2)} seconds`);
    assert.ok(s.speed <= 350);
  }
  assert.ok(s.passed > 50);
  assert.ok(dashScore(s) > 2000);
});
