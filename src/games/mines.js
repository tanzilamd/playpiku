import { frame, listen, resultOverlay } from "./shared.js";
import {
  MINE_LEVELS,
  createMinefield,
  revealMines,
  chordTargets,
} from "../engines/mines.js";
import { get, set, record } from "../store.js";
const flagIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 21V3m0 0h12l-3 4 3 4H6"/></svg>';
export function mount(root, ctx) {
  const events = listen();
  let level = Object.hasOwn(MINE_LEVELS, get("mines-level"))
      ? get("mines-level")
      : "easy",
    cells,
    generated = false,
    state = "ready",
    flagMode = false,
    focusCell = 0,
    elapsed = 0,
    startedAt = 0,
    timer,
    exploded = null;
  const ui = frame(
    root,
    {
      stats: [
        ["Mines left", 10, "mines-left"],
        ["Time", "0:00", "time"],
        ["Best", "—", "best"],
      ],
      options: `<label>Difficulty <select id="mine-level">${Object.entries(
        MINE_LEVELS,
      )
        .map(([id, l]) => `<option value="${id}">${l.label}</option>`)
        .join("")}</select></label>`,
      body: '<div class="mines-shell" id="game-board"><div class="mines-scroll" tabindex="0" role="region" aria-label="Scrollable Minesweeper board"><div class="mines-grid" role="group" aria-label="Minesweeper board"></div></div></div>',
      controls: `<button class="button secondary flag-toggle" id="flag-mode" aria-pressed="false">${flagIcon}<span>Flag mode: Off</span></button><button class="button secondary" id="game-start">Pause</button>`,
      note: "Tap to reveal · Right-click or use Flag mode to mark a mine · First reveal is always safe",
    },
    ctx,
  );
  const shell = ui.el("#game-board"),
    grid = ui.el(".mines-grid"),
    pauseButton = ui.el("#game-start");
  function now() {
    return elapsed + (state === "playing" ? performance.now() - startedAt : 0);
  }
  function seconds() {
    return Math.floor(now() / 1000);
  }
  function timeText(value) {
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }
  function update() {
    ui.stat("time", timeText(seconds()));
    ui.stat(
      "mines-left",
      MINE_LEVELS[level].mines - cells.filter((c) => c.flagged).length,
    );
    const best = get("best:mines-" + level);
    ui.stat("best", best === null ? "—" : timeText(best));
    pauseButton.disabled = state !== "playing" && state !== "paused";
    pauseButton.textContent = state === "paused" ? "Resume" : "Pause";
  }
  function freeze() {
    if (state === "playing") elapsed += performance.now() - startedAt;
    clearInterval(timer);
    timer = null;
  }
  function begin() {
    state = "playing";
    startedAt = performance.now();
    clearInterval(timer);
    timer = setInterval(update, 250);
    update();
  }
  function draw() {
    const size = MINE_LEVELS[level].size,
      hasFocus = grid.contains(document.activeElement);
    grid.style.setProperty("--mine-size", size);
    grid.style.setProperty("--mine-columns", size);
    grid.innerHTML = cells
      .map((c, i) => {
        const showMine = c.mine && (state === "lost" || state === "won"),
          wrongFlag = state === "lost" && c.flagged && !c.mine;
        const label =
          c.revealed && !c.mine
            ? `${c.number ? c.number + " adjacent mines" : "empty"}`
            : wrongFlag
              ? "incorrect flag"
              : showMine
                ? "mine"
                : c.flagged
                  ? "flagged"
                  : "covered";
        return `<button class="mine-cell ${c.revealed ? "revealed" : ""} ${showMine ? "mine-visible" : ""} ${i === exploded ? "exploded" : ""} ${wrongFlag ? "wrong-flag" : ""}" data-mine-cell="${i}" data-number="${c.revealed ? c.number : ""}" tabindex="${i === focusCell ? 0 : -1}" aria-label="Row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}, ${label}">${wrongFlag ? "×" : showMine ? '<span class="mine-dot" aria-hidden="true"></span>' : c.flagged ? flagIcon : c.revealed && c.number ? c.number : ""}</button>`;
      })
      .join("");
    if (hasFocus) grid.children[focusCell]?.focus({ preventScroll: true });
    update();
  }
  function finish(won) {
    freeze();
    state = won ? "won" : "lost";
    if (won) {
      for (const c of cells) if (c.mine) c.flagged = true;
      const fresh = record("mines-" + level, seconds(), true);
      ui.say(
        `${fresh ? "New personal best! " : ""}All safe squares found in ${timeText(seconds())}.`,
      );
    } else
      ui.say(
        "That square held a mine. Try a fresh board with a safe first reveal.",
      );
    draw();
    ctx.sound(won ? "win" : "lose");
    // Keep the solved board visible; the result sits below it.
    ui.el(".mine-result")?.remove();
    const result = document.createElement("div");
    result.className = "mine-result";
    result.innerHTML = `<strong>${won ? "A clean sweep. Nicely done!" : "A little boom. A fresh beginning?"}</strong><p>${won ? "Every safe square found." : "Mines are now shown. Incorrect flags are marked with ×."}</p><button class="button primary">Play again</button>`;
    result.querySelector("button").onclick = restart;
    shell.append(result);
  }
  function reveal(index) {
    if (
      state === "paused" ||
      state === "won" ||
      state === "lost" ||
      cells[index].flagged
    )
      return;
    if (!generated) {
      const flags = cells.map((c) => c.flagged);
      cells = createMinefield(
        MINE_LEVELS[level].size,
        MINE_LEVELS[level].mines,
        index,
      );
      cells.forEach((c, i) => (c.flagged = flags[i]));
      generated = true;
      begin();
    }
    const targets = cells[index].revealed
      ? chordTargets(cells, MINE_LEVELS[level].size, index)
      : [index];
    if (!targets.length) {
      ui.say("Tip: reveal neighboring squares, or flag the suspected mines.");
      return;
    }
    const result = revealMines(cells, MINE_LEVELS[level].size, targets);
    cells = result.cells;
    exploded = result.exploded;
    if (exploded !== null) {
      finish(false);
      return;
    }
    if (result.won) {
      finish(true);
      return;
    }
    draw();
    ctx.sound();
    ui.say(
      `${cells.filter((c) => c.revealed).length} safe squares revealed. Keep following the numbers.`,
    );
  }
  function flag(index) {
    if (
      state === "paused" ||
      state === "won" ||
      state === "lost" ||
      cells[index].revealed
    )
      return;
    const cell = cells[index];
    if (
      !cell.flagged &&
      cells.filter((c) => c.flagged).length >= MINE_LEVELS[level].mines
    ) {
      ui.say("All flags are in use. Remove one to mark another square.");
      return;
    }
    cell.flagged = !cell.flagged;
    draw();
    ctx.sound();
    ui.say(cell.flagged ? "Flag placed." : "Flag removed.");
  }
  function pause() {
    if (state !== "playing") return;
    freeze();
    state = "paused";
    update();
    resultOverlay(
      shell,
      "A little thinking break.",
      "Your board and timer are paused.",
      resume,
      "Resume",
    );
    ui.say("Game paused. Select Resume to continue.");
  }
  function resume() {
    if (state !== "paused") return;
    shell.querySelector(".board-overlay")?.remove();
    begin();
    ui.say("Game resumed.");
  }
  function restart() {
    freeze();
    state = "ready";
    elapsed = 0;
    startedAt = 0;
    generated = false;
    exploded = null;
    focusCell = 0;
    cells = Array.from({ length: MINE_LEVELS[level].size ** 2 }, () => ({
      mine: false,
      number: 0,
      revealed: false,
      flagged: false,
    }));
    shell.querySelector(".board-overlay")?.remove();
    ui.el(".mine-result")?.remove();
    draw();
    ui.say(
      "Choose any square. Your first reveal and its neighboring squares are safe.",
    );
  }
  events.on(grid, "click", (e) => {
    const b = e.target.closest("[data-mine-cell]");
    if (!b) return;
    focusCell = Number(b.dataset.mineCell);
    flagMode ? flag(focusCell) : reveal(focusCell);
  });
  events.on(grid, "contextmenu", (e) => {
    const b = e.target.closest("[data-mine-cell]");
    if (!b) return;
    e.preventDefault();
    focusCell = Number(b.dataset.mineCell);
    flag(focusCell);
  });
  events.on(grid, "keydown", (e) => {
    const b = e.target.closest("[data-mine-cell]");
    if (!b) return;
    const i = Number(b.dataset.mineCell),
      size = MINE_LEVELS[level].size;
    let next = i;
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      flag(i);
      return;
    }
    if (e.key === "ArrowLeft") next = Math.max(i - (i % size), i - 1);
    else if (e.key === "ArrowRight")
      next = Math.min(i - (i % size) + size - 1, i + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, i - size);
    else if (e.key === "ArrowDown") next = Math.min(cells.length - 1, i + size);
    else return;
    e.preventDefault();
    grid.children[i].tabIndex = -1;
    focusCell = next;
    grid.children[next].tabIndex = 0;
    grid.children[next].focus();
  });
  events.on(ui.el("#flag-mode"), "click", (e) => {
    flagMode = !flagMode;
    const button = e.currentTarget;
    button.setAttribute("aria-pressed", flagMode);
    button.querySelector("span").textContent =
      `Flag mode: ${flagMode ? "On" : "Off"}`;
    shell.classList.toggle("flagging", flagMode);
    ui.say(
      flagMode
        ? "Flag mode on. Tap a covered square to place or remove a flag."
        : "Reveal mode on. Tap a covered square to reveal it.",
    );
  });
  events.on(pauseButton, "click", () =>
    state === "paused" ? resume() : pause(),
  );
  ui.el("#mine-level").value = level;
  events.on(ui.el("#mine-level"), "change", (e) => {
    if (state === "playing" || state === "paused") {
      e.target.value = level;
      ctx.toast("Restart this game first to change difficulty.");
      return;
    }
    level = e.target.value;
    set("mines-level", level);
    restart();
  });
  restart();
  return {
    restart,
    pause,
    isPlaying: () =>
      state === "playing" ||
      state === "paused" ||
      (state === "ready" && cells.some((c) => c.flagged)),
    destroy: () => {
      freeze();
      events.destroy();
    },
  };
}
