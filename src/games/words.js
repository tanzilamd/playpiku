import { frame, listen, resultOverlay } from "./shared.js";
import {
  WORD_THEMES,
  WORD_MODES,
  createWordBoard,
  wordPath,
  selectedWord,
} from "../engines/words.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let mode = Object.hasOwn(WORD_MODES, get("words-mode"))
      ? get("words-mode")
      : "easy",
    theme = Object.hasOwn(WORD_THEMES, get("words-theme"))
      ? get("words-theme")
      : "nature",
    puzzle,
    found = [],
    anchor = null,
    focusCell = 0,
    drag = null,
    state = "ready",
    elapsed = 0,
    startedAt = 0,
    timer,
    hints = 0,
    hintTimer,
    hintActive = false,
    hintedWord = null;
  const ui = frame(
    root,
    {
      stats: [
        ["Found", "0 / 6", "found"],
        ["Time", "0:00", "time"],
        ["Best", "—", "best"],
      ],
      options: `<label>Topic <select id="word-theme">${Object.keys(WORD_THEMES)
        .map(
          (id) =>
            `<option value="${id}">${id[0].toUpperCase() + id.slice(1)}</option>`,
        )
        .join(
          "",
        )}</select></label><label>Challenge <select id="word-mode">${Object.entries(
        WORD_MODES,
      )
        .map(([id, m]) => `<option value="${id}">${m.label}</option>`)
        .join("")}</select></label>`,
      body: '<div class="word-shell" id="game-board"><div class="word-grid" role="group" aria-label="Word Hunt letter board"></div></div><p class="word-selection" id="word-selection">Select a first letter, then the last.</p><ul class="word-list" aria-label="Words to find"></ul><p class="hint-note" id="hint-penalty">No hints used</p>',
      controls:
        '<button class="button primary" id="game-start">Start puzzle</button><button class="button secondary" id="word-pause" disabled>Pause</button><button class="button secondary" id="word-hint" disabled>Hint (+30s)</button><button class="text-button" id="clear-word" disabled>Clear selection</button>',
      note: "Tap the first and last letters, or drag across a word. Words follow a straight line; selecting backward works too.",
    },
    ctx,
  );
  ui.el(".game-options").classList.add("word-options");
  const shell = ui.el("#game-board"),
    grid = ui.el(".word-grid");
  const timeText = (n) =>
    `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const seconds = () =>
    Math.floor(
      (elapsed + (state === "playing" ? performance.now() - startedAt : 0)) /
        1000,
    );
  function update() {
    ui.stat("found", `${found.length} / ${puzzle.words.length}`);
    ui.stat("time", timeText(seconds()));
    const best = get("best:words-" + mode);
    ui.stat("best", best === null ? "—" : timeText(best));
    ui.el("#game-start").textContent =
      state === "ready"
        ? "Start puzzle"
        : state === "paused"
          ? "Resume"
          : "New puzzle";
    ui.el("#word-pause").disabled = state !== "playing";
    ui.el("#word-hint").disabled = state !== "playing" || hintActive;
    ui.el("#clear-word").disabled = state !== "playing" || anchor === null;
    ui.el("#hint-penalty").textContent = hints
      ? `Hint adjustment: +${hints * 30}s to your final time`
      : "No hints used";
  }
  function freeze() {
    if (state === "playing") elapsed += performance.now() - startedAt;
    clearInterval(timer);
    timer = null;
  }
  function clearSelection() {
    anchor = null;
    grid
      .querySelectorAll(".selecting")
      .forEach((el) => el.classList.remove("selecting"));
    ui.el("#word-selection").textContent =
      "Select a first letter, then the last.";
    update();
  }
  function highlight(path) {
    grid
      .querySelectorAll(".selecting")
      .forEach((el) => el.classList.remove("selecting"));
    for (const i of path) grid.children[i].classList.add("selecting");
    ui.el("#word-selection").textContent = path.length
      ? path.map((i) => puzzle.grid[i]).join(" ")
      : "Choose a straight line.";
  }
  function finish() {
    freeze();
    state = "won";
    anchor = null;
    const adjusted = seconds() + hints * 30,
      fresh = record("words-" + mode, adjusted, true);
    update();
    ctx.sound("win");
    resultOverlay(
      shell,
      fresh ? "A fresh personal best!" : "Every word found. Beautiful.",
      `${timeText(seconds())} playing time${hints ? ` + ${hints * 30}s for hints` : ""}. Final time ${timeText(adjusted)}.`,
      restart,
      "New puzzle",
    );
    ui.say(
      `All ${puzzle.words.length} words found. Final time ${timeText(adjusted)}${fresh ? ". New personal best!" : ""}`,
    );
  }
  function submit(from, to) {
    const path = wordPath(from, to, puzzle.size);
    if (!path.length) {
      ui.say(
        "Keep your selection in a straight line. Choose another end letter.",
      );
      highlight([from]);
      update();
      return;
    }
    const word = selectedWord(puzzle, path, found);
    if (word) {
      if (word === hintedWord) {
        clearTimeout(hintTimer);
        hintActive = false;
        hintedWord = null;
        grid
          .querySelectorAll(".word-hint")
          .forEach((el) => el.classList.remove("word-hint"));
      }
      found.push(word);
      for (const i of path) grid.children[i].classList.add("word-found");
      const label = ui.el(`[data-word="${word}"]`);
      label.classList.add("found");
      label.setAttribute("aria-label", word + ", found");
      ctx.sound("win");
      clearSelection();
      ui.say(`${word} found! ${found.length} of ${puzzle.words.length} words.`);
      if (found.length === puzzle.words.length) finish();
    } else {
      clearSelection();
      ui.say("Not a new word from the list. Try another line.");
    }
  }
  function choose(index) {
    if (state !== "playing") return;
    focusCell = index;
    if (anchor === null) {
      anchor = index;
      highlight([index]);
      update();
    } else if (anchor === index) clearSelection();
    else submit(anchor, index);
  }
  function run() {
    if (state === "won") return;
    state = "playing";
    startedAt = performance.now();
    shell.querySelector(".board-overlay")?.remove();
    clearInterval(timer);
    timer = setInterval(update, 250);
    update();
    grid.children[focusCell].focus({ preventScroll: true });
    ui.say(
      "Find the listed words. Select their first and last letters, or drag in a straight line.",
    );
  }
  function pause() {
    if (state !== "playing") return;
    freeze();
    state = "paused";
    drag = null;
    clearSelection();
    update();
    resultOverlay(
      shell,
      "A little word break.",
      "Your puzzle and timer are paused.",
      run,
      "Resume",
    );
    ui.say("Puzzle paused. Select Resume to continue.");
  }
  function restart() {
    freeze();
    clearTimeout(hintTimer);
    state = "ready";
    elapsed = 0;
    hints = 0;
    hintActive = false;
    hintedWord = null;
    found = [];
    anchor = null;
    drag = null;
    focusCell = 0;
    puzzle = createWordBoard(theme, mode);
    shell.querySelector(".board-overlay")?.remove();
    grid.innerHTML = puzzle.grid
      .map(
        (letter, i) =>
          `<button class="letter-cell" data-letter="${i}" tabindex="${i === 0 ? 0 : -1}" aria-label="Row ${Math.floor(i / 8) + 1}, column ${(i % 8) + 1}: ${letter}">${letter}</button>`,
      )
      .join("");
    ui.el(".word-list").innerHTML = puzzle.words
      .map(
        (word) =>
          `<li data-word="${word}" aria-label="${word}, not found"><span aria-hidden="true">○</span>${word}</li>`,
      )
      .join("");
    ui.el("#word-selection").textContent =
      "Select a first letter, then the last.";
    update();
    resultOverlay(
      shell,
      "Find your little wonders.",
      `${puzzle.words.length} words · ${theme[0].toUpperCase() + theme.slice(1)} · No time limit.`,
      run,
      "Start puzzle",
    );
    ui.say("Your new word puzzle is ready.");
  }
  function hit(e) {
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-letter]");
    return target && grid.contains(target)
      ? Number(target.dataset.letter)
      : null;
  }
  events.on(grid, "pointerdown", (e) => {
    if (state !== "playing" || e.button !== 0) return;
    const b = e.target.closest("[data-letter]");
    if (!b) return;
    e.preventDefault();
    focusCell = Number(b.dataset.letter);
    grid.querySelector('[tabindex="0"]').tabIndex = -1;
    b.tabIndex = 0;
    b.focus({ preventScroll: true });
    drag = { index: focusCell, x: e.clientX, y: e.clientY, moved: false };
    grid.setPointerCapture(e.pointerId);
  });
  events.on(grid, "pointermove", (e) => {
    const end = hit(e);
    if (drag) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6)
        drag.moved = true;
      if (drag.moved && end !== null) highlight(wordPath(drag.index, end));
    } else if (anchor !== null && end !== null && state === "playing")
      highlight(wordPath(anchor, end));
  });
  events.on(grid, "pointerup", (e) => {
    if (!drag) return;
    const current = drag,
      end = hit(e);
    drag = null;
    if (state !== "playing") return;
    if (current.moved) {
      anchor = current.index;
      if (end !== null) submit(current.index, end);
      else clearSelection();
    } else choose(current.index);
  });
  events.on(grid, "pointercancel", () => {
    drag = null;
    clearSelection();
  });
  events.on(grid, "click", (e) => {
    if (e.detail !== 0) return;
    const b = e.target.closest("[data-letter]");
    if (b) choose(Number(b.dataset.letter));
  });
  events.on(grid, "keydown", (e) => {
    const b = e.target.closest("[data-letter]");
    if (!b || state !== "playing") return;
    const i = Number(b.dataset.letter);
    let next = i;
    if (e.key === "Escape") {
      e.preventDefault();
      clearSelection();
      return;
    }
    if (e.key === "ArrowLeft") next = Math.max(i - (i % 8), i - 1);
    else if (e.key === "ArrowRight") next = Math.min(i - (i % 8) + 7, i + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, i - 8);
    else if (e.key === "ArrowDown") next = Math.min(63, i + 8);
    else return;
    e.preventDefault();
    b.tabIndex = -1;
    focusCell = next;
    grid.children[next].tabIndex = 0;
    grid.children[next].focus();
    if (anchor !== null) highlight(wordPath(anchor, next));
  });
  events.on(ui.el("#game-start"), "click", () =>
    state === "ready" || state === "paused"
      ? run()
      : state === "won"
        ? restart()
        : ctx.restart(),
  );
  events.on(ui.el("#word-pause"), "click", pause);
  events.on(ui.el("#clear-word"), "click", clearSelection);
  events.on(ui.el("#word-hint"), "click", () => {
    if (state !== "playing" || hintActive) return;
    const word = puzzle.words.find((w) => !found.includes(w)),
      index = puzzle.placements[word][0];
    hints++;
    hintActive = true;
    hintedWord = word;
    grid
      .querySelectorAll(".word-hint")
      .forEach((el) => el.classList.remove("word-hint"));
    grid.children[index].classList.add("word-hint");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      grid.children[index]?.classList.remove("word-hint");
      hintActive = false;
      hintedWord = null;
      update();
    }, 2500);
    update();
    ui.say(
      `Try ${word}. Its first letter is highlighted. 30 seconds added to your final time.`,
    );
  });
  ui.el("#word-theme").value = theme;
  ui.el("#word-mode").value = mode;
  for (const id of ["word-theme", "word-mode"])
    events.on(ui.el("#" + id), "change", (e) => {
      if (state === "playing" || state === "paused") {
        e.target.value = id === "word-theme" ? theme : mode;
        ctx.toast("Start a new puzzle first to change topic or challenge.");
        return;
      }
      if (id === "word-theme") {
        theme = e.target.value;
        set("words-theme", theme);
      } else {
        mode = e.target.value;
        set("words-mode", mode);
      }
      restart();
    });
  events.on(window, "blur", pause);
  restart();
  return {
    restart,
    pause,
    isPlaying: () => state === "playing" || state === "paused",
    destroy: () => {
      freeze();
      clearTimeout(hintTimer);
      events.destroy();
    },
  };
}
