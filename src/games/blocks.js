import { frame, listen, resultOverlay } from "./shared.js";
import {
  SHAPES,
  fitsBlock,
  canPlaceBlock,
  placeBlock,
  makeTray,
  hasBlockMove,
  validBlockSave,
} from "../engines/blocks.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let board = Array(64).fill(0),
    tray = [],
    score = 0,
    combo = 0,
    selected = null,
    done = false,
    focusCell = 0,
    drag = null,
    suppressClickUntil = 0,
    lastDrop = null;
  const ui = frame(
    root,
    {
      stats: [
        ["Score", 0, "score"],
        ["Best", get("best:blocks", 0), "best"],
        ["Combo", "—", "combo"],
      ],
      body: '<div class="blocks-shell" id="game-board"><div class="blocks-grid" role="group" aria-label="Block Puzzle board"></div></div><div class="block-tray" role="group" aria-label="Available pieces"></div>',
      controls:
        '<button class="button secondary" id="deselect">Deselect piece</button>',
      note: "Select a piece, then tap its top-left position on the board. Dragging works too.",
    },
    ctx,
  );
  const shell = ui.el("#game-board"),
    grid = ui.el(".blocks-grid"),
    pieces = ui.el(".block-tray");
  function persist() {
    set("blocks-save", { board, tray, score, combo });
  }
  function stats() {
    ui.stat("score", score);
    ui.stat("best", get("best:blocks", 0));
    ui.stat("combo", combo ? `×${combo}` : "—");
  }
  function draw() {
    grid.innerHTML = board
      .map(
        (n, i) =>
          `<button class="block-cell ${n ? "filled" : ""}" data-block-cell="${i}" tabindex="${i === focusCell ? 0 : -1}" aria-label="Row ${Math.floor(i / 8) + 1}, column ${(i % 8) + 1}, ${n ? "occupied" : "empty"}"></button>`,
      )
      .join("");
    pieces.innerHTML = tray
      .map((id, i) => {
        if (id === null)
          return `<div class="piece-slot used"><span aria-hidden="true">✓</span><span>Placed</span></div>`;
        const shape = SHAPES[id],
          width = Math.max(...shape.map((c) => c[0])) + 1,
          height = Math.max(...shape.map((c) => c[1])) + 1,
          fits = canPlaceBlock(board, shape);
        return `<button class="piece-slot ${selected === i ? "selected" : ""} ${fits ? "" : "no-fit"}" data-piece="${i}" aria-pressed="${selected === i}" aria-label="Piece ${i + 1}, ${shape.length} blocks, ${width} columns by ${height} rows${fits ? "" : ", cannot fit yet"}"><span class="piece-shape" style="--piece-width:${width};--piece-height:${height}" aria-hidden="true">${shape.map(([x, y]) => `<i style="grid-column:${x + 1};grid-row:${y + 1}"></i>`).join("")}</span><span>${fits ? (selected === i ? "Selected" : "Select piece") : "No space yet"}</span></button>`;
      })
      .join("");
    ui.el("#deselect").disabled = selected === null;
    stats();
  }
  function preview(index) {
    grid
      .querySelectorAll(".preview,.invalid")
      .forEach((c) => c.classList.remove("preview", "invalid"));
    if (selected === null || tray[selected] === null || done) return;
    const shape = SHAPES[tray[selected]],
      x = index % 8,
      y = Math.floor(index / 8),
      valid = fitsBlock(board, shape, x, y);
    for (const [dx, dy] of shape)
      if (x + dx < 8 && y + dy < 8)
        grid.children[(y + dy) * 8 + x + dx]?.classList.add(
          valid ? "preview" : "invalid",
        );
  }
  function finish() {
    done = true;
    selected = null;
    draw();
    resultOverlay(
      shell,
      "Every block had its moment.",
      `Your score: ${score}. Make some room for a fresh start.`,
      restart,
    );
    ui.say(`No available piece fits. Final score ${score}.`);
    ctx.sound("lose");
  }
  function select(i) {
    if (done || tray[i] === null) return;
    selected = i;
    draw();
    ui.say(
      `Piece ${i + 1} selected. Choose its top-left position on the board.`,
    );
  }
  function place(index) {
    if (done) return;
    if (selected === null) {
      ui.say("Choose a piece below the board first.");
      return;
    }
    const result = placeBlock(
      board,
      SHAPES[tray[selected]],
      index % 8,
      Math.floor(index / 8),
      combo,
    );
    if (!result) {
      ui.say("That piece won’t fit there. Try another position.");
      ctx.sound("lose");
      return;
    }
    const wasKeyboard = grid.contains(document.activeElement);
    board = result.board;
    score += result.points;
    combo = result.combo;
    tray[selected] = null;
    selected = null;
    record("blocks", score);
    if (tray.every((id) => id === null)) tray = makeTray(board);
    persist();
    draw();
    if (wasKeyboard) grid.children[focusCell]?.focus({ preventScroll: true });
    ctx.sound(result.lines ? "win" : "tap");
    ui.say(
      result.lines
        ? `${result.lines} ${result.lines === 1 ? "line" : "lines"} cleared! Combo ×${combo}. +${result.points} points.`
        : `Nice fit! +${result.points} points. Choose your next piece.`,
    );
    if (!hasBlockMove(board, tray)) finish();
  }
  function restart() {
    board = Array(64).fill(0);
    tray = makeTray(board);
    score = 0;
    combo = 0;
    selected = null;
    done = false;
    focusCell = 0;
    drag = null;
    shell.querySelector(".board-overlay")?.remove();
    persist();
    draw();
    ui.say("Three pieces. Plenty of possibilities. Choose one to begin.");
  }
  function fromDrop(e) {
    return (
      e.detail > 0 &&
      lastDrop &&
      performance.now() < suppressClickUntil &&
      Math.hypot(e.clientX - lastDrop.x, e.clientY - lastDrop.y) < 8
    );
  }
  events.on(pieces, "click", (e) => {
    if (fromDrop(e)) return;
    const b = e.target.closest("[data-piece]");
    if (b) {
      select(Number(b.dataset.piece));
      if (e.detail === 0) grid.children[focusCell]?.focus();
    }
  });
  events.on(grid, "click", (e) => {
    if (fromDrop(e)) return;
    const b = e.target.closest("[data-block-cell]");
    if (b) {
      focusCell = Number(b.dataset.blockCell);
      place(focusCell);
    }
  });
  events.on(grid, "pointerover", (e) => {
    const b = e.target.closest("[data-block-cell]");
    if (b) preview(Number(b.dataset.blockCell));
  });
  events.on(grid, "pointerleave", () =>
    grid
      .querySelectorAll(".preview,.invalid")
      .forEach((c) => c.classList.remove("preview", "invalid")),
  );
  events.on(grid, "keydown", (e) => {
    const b = e.target.closest("[data-block-cell]");
    if (!b) return;
    const i = Number(b.dataset.blockCell);
    let next = i;
    if (e.key === "ArrowLeft") next = Math.max(i - (i % 8), i - 1);
    else if (e.key === "ArrowRight") next = Math.min(i - (i % 8) + 7, i + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, i - 8);
    else if (e.key === "ArrowDown") next = Math.min(63, i + 8);
    else if (e.key === "Escape") {
      selected = null;
      draw();
      grid.children[i].focus();
      return;
    } else return;
    e.preventDefault();
    grid.children[i].tabIndex = -1;
    focusCell = next;
    grid.children[next].tabIndex = 0;
    grid.children[next].focus();
    preview(next);
  });
  events.on(ui.el("#deselect"), "click", () => {
    selected = null;
    draw();
    ui.say("Piece deselected.");
  });
  events.on(pieces, "pointerdown", (e) => {
    const b = e.target.closest("[data-piece]");
    if (!b || done || e.button !== 0) return;
    drag = {
      id: Number(b.dataset.piece),
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
  });
  events.on(document, "pointermove", (e) => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8 && !drag.moved) {
      drag.moved = true;
      pieces.setPointerCapture(e.pointerId);
      select(drag.id);
    }
    if (!drag.moved) return;
    const rect = grid.getBoundingClientRect(),
      x = Math.floor(((e.clientX - rect.left) / rect.width) * 8),
      y = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
    if (x >= 0 && x < 8 && y >= 0 && y < 8) preview(y * 8 + x);
  });
  events.on(document, "pointerup", (e) => {
    if (!drag) return;
    if (drag.moved) {
      suppressClickUntil = performance.now() + 120;
      lastDrop = { x: e.clientX, y: e.clientY };
      const rect = grid.getBoundingClientRect(),
        x = Math.floor(((e.clientX - rect.left) / rect.width) * 8),
        y = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
      if (x >= 0 && x < 8 && y >= 0 && y < 8) place(y * 8 + x);
      else
        ui.say("Drop inside the board, or tap a square to place this piece.");
    }
    drag = null;
  });
  events.on(document, "pointercancel", () => {
    drag = null;
  });
  events.on(window, "blur", () => {
    drag = null;
  });
  const saved = get("blocks-save");
  if (validBlockSave(saved)) {
    ({ board, tray, score, combo } = saved);
    if (tray.every((id) => id === null)) tray = makeTray(board);
    draw();
    ui.say("Your saved board is ready. Choose a piece to continue.");
    if (!hasBlockMove(board, tray)) finish();
  } else restart();
  return {
    restart,
    pause: () => {
      drag = null;
      grid
        .querySelectorAll(".preview,.invalid")
        .forEach((cell) => cell.classList.remove("preview", "invalid"));
    },
    isPlaying: () => score > 0 && !done,
    destroy: () => {
      persist();
      events.destroy();
    },
  };
}
