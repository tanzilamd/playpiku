import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeLine,
  move2048,
  canMove2048,
  winner,
  bestMove,
  nextSnake,
  shuffle,
} from "../src/rules.js";
test("2048 merges each source tile once and counts the new tile values", () => {
  assert.deepEqual(mergeLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], score: 8 });
  assert.deepEqual(mergeLine([2, 2, 4, 0]), { line: [4, 4, 0, 0], score: 4 });
  assert.deepEqual(mergeLine([0, 4, 0, 4]), { line: [8, 0, 0, 0], score: 8 });
});
test("2048 moves in all directions without mutating the original board", () => {
  const board = [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    copy = [...board];
  assert.deepEqual(move2048(board, "left").board.slice(0, 4), [4, 0, 0, 0]);
  assert.deepEqual(move2048(board, "right").board.slice(0, 4), [0, 0, 0, 4]);
  assert.equal(move2048(board, "up").board[0], 4);
  assert.equal(move2048(board, "down").board[12], 4);
  assert.deepEqual(board, copy);
});
test("2048 identifies terminal boards and allows an available merge on a full board", () => {
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(canMove2048(full), false);
  full[0] = 4;
  assert.equal(canMove2048(full), true);
  assert.equal(move2048([2, ...Array(15).fill(0)], "left").moved, false);
});
test("tic tac toe detects diagonals, rows and a genuine draw", () => {
  assert.deepEqual(winner(["X", "", "O", "", "X", "O", "", "", "X"]), {
    player: "X",
    line: [0, 4, 8],
  });
  assert.equal(winner(["O", "O", "O", "", "", "", "", "", ""]).player, "O");
  assert.equal(
    winner(["X", "O", "X", "X", "O", "O", "O", "X", "X"]).player,
    "draw",
  );
  assert.equal(winner(Array(9).fill("")), null);
});
test("hard computer wins when possible and blocks an immediate loss", () => {
  assert.equal(bestMove(["O", "O", "", "X", "X", "", "", "", ""]), 2);
  assert.equal(bestMove(["X", "X", "", "", "O", "", "", "", ""]), 2);
});
test("hard computer never loses against any legal human play, as first or second player", () => {
  let terminals = 0;
  function visit(board, turn) {
    const end = winner(board);
    if (end) {
      assert.notEqual(end.player, "X");
      terminals++;
      return;
    }
    if (turn === "O") {
      const next = [...board];
      next[bestMove(board)] = "O";
      visit(next, "X");
    } else
      for (let i = 0; i < 9; i++)
        if (!board[i]) {
          const next = [...board];
          next[i] = "X";
          visit(next, "O");
        }
  }
  visit(Array(9).fill(""), "X");
  visit(Array(9).fill(""), "O");
  assert.ok(terminals > 100);
});
test("snake grows only when eating and detects walls and its own body", () => {
  const snake = [
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ];
  const eat = nextSnake(snake, { x: 1, y: 0 }, { x: 3, y: 2 }, 5);
  assert.equal(eat.ate, true);
  assert.equal(eat.snake.length, 4);
  assert.equal(
    nextSnake(snake, { x: 0, y: 1 }, { x: 4, y: 4 }, 5).snake.length,
    3,
  );
  assert.equal(nextSnake(snake, { x: -1, y: 0 }, { x: 4, y: 4 }, 5).dead, true);
  assert.equal(
    nextSnake([{ x: 0, y: 0 }], { x: -1, y: 0 }, { x: 4, y: 4 }, 5).dead,
    true,
  );
});
test("snake may safely enter the old tail cell on a non-eating move", () => {
  const snake = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 1 },
  ];
  assert.equal(
    nextSnake(snake, { x: -1, y: 0 }, { x: 4, y: 4 }, 5).dead,
    false,
  );
});
test("shuffle preserves input and every item", () => {
  const a = [1, 2, 3, 4];
  assert.deepEqual(shuffle(a).sort(), a);
  assert.deepEqual(a, [1, 2, 3, 4]);
});
