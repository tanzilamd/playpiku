import {
  frame,
  listen,
  swipe,
  pad,
  keyDirections,
  keyboardAllowed,
  resultOverlay,
} from "./shared.js";
import { move2048, canMove2048 } from "../rules.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  let board = Array(16).fill(0),
    score = 0,
    previous = null,
    won = false,
    done = false;
  const events = listen();
  const ui = frame(
    root,
    {
      stats: [
        ["Score", 0, "score"],
        ["Best", get("best:2048", 0), "best"],
      ],
      body: '<div class="tiles-board" id="game-board" tabindex="0" role="group" aria-label="2048 board. Use arrow keys or swipe to move tiles."></div>',
      controls: `<button id="undo" class="button secondary">↶ Undo move</button>${pad}`,
      note: "Merge matching tiles. Keep your biggest number in a corner.",
    },
    ctx,
  );
  const area = ui.el("#game-board");
  function persist() {
    set("2048-save", { board, score, won });
  }
  function draw() {
    area.innerHTML = board
      .map(
        (n, i) =>
          `<div class="number-tile ${n ? "occupied" : ""}" data-value="${n}" aria-label="Row ${Math.floor(i / 4) + 1}, column ${(i % 4) + 1}: ${n || "empty"}"><span>${n || ""}</span></div>`,
      )
      .join("");
    ui.stat("score", score);
    ui.stat("best", get("best:2048", 0));
    ui.el("#undo").disabled = !previous;
  }
  function spawn() {
    const empty = board.flatMap((n, i) => (n ? [] : [i]));
    if (empty.length)
      board[empty[Math.floor(Math.random() * empty.length)]] =
        Math.random() < 0.9 ? 2 : 4;
  }
  function restart() {
    board = Array(16).fill(0);
    score = 0;
    previous = null;
    won = false;
    done = false;
    spawn();
    spawn();
    draw();
    persist();
    ui.say("A fresh board. Find your next move.");
  }
  function move(direction) {
    if (
      done ||
      document.querySelector("dialog[open]") ||
      area.querySelector(".board-overlay")
    )
      return;
    const next = move2048(board, direction);
    if (!next.moved) return;
    previous = { board: [...board], score, won };
    board = next.board;
    score += next.score;
    spawn();
    record("2048", score);
    draw();
    persist();
    ctx.sound(next.score ? "win" : "tap");
    if (!won && board.some((n) => n >= 2048)) {
      won = true;
      persist();
      resultOverlay(
        area,
        "Hello, 2048!",
        "You made it. Want to see how far you can go?",
        () => {
          area.querySelector(".board-overlay").remove();
          area.focus();
        },
        "Keep playing",
      );
      ui.say("You reached 2048!");
    } else if (!canMove2048(board)) {
      done = true;
      resultOverlay(
        area,
        "Every move mattered.",
        `Your score: ${score}. Ready for a fresh board?`,
        restart,
      );
      ui.say(`No moves left. Final score ${score}.`);
    } else
      ui.say(
        `${next.score ? `Added ${next.score} points. ` : ""}Score ${score}.`,
      );
  }
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || !keyDirections[e.key]) return;
    e.preventDefault();
    move(keyDirections[e.key]);
  });
  swipe(area, move, events);
  root
    .querySelectorAll("[data-dir]")
    .forEach((b) => events.on(b, "click", () => move(b.dataset.dir)));
  events.on(ui.el("#undo"), "click", () => {
    if (!previous) return;
    ({ board, score, won } = previous);
    previous = null;
    done = false;
    draw();
    persist();
    ui.say("Last move undone. Try a different direction.");
  });
  const saved = get("2048-save");
  const valid =
    saved &&
    Array.isArray(saved.board) &&
    saved.board.length === 16 &&
    saved.board.filter(Boolean).length >= 2 &&
    saved.board.every(
      (n) =>
        Number.isInteger(n) &&
        n >= 0 &&
        n <= 2 ** 30 &&
        (n === 0 || (n >= 2 && Number.isInteger(Math.log2(n)))),
    ) &&
    Number.isFinite(saved.score) &&
    saved.score >= 0;
  if (valid) {
    board = saved.board;
    score = saved.score;
    won = !!saved.won;
    draw();
    if (!canMove2048(board)) {
      done = true;
      resultOverlay(
        area,
        "A fresh start?",
        `Your last board finished at ${score} points.`,
        restart,
      );
    }
    ui.say("Your saved board is ready.");
  } else restart();
  return {
    restart,
    isPlaying: () => score > 0 && !done,
    destroy: () => events.destroy(),
  };
}
