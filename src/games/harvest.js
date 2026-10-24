import { frame, listen } from "./shared.js";
import {
  CROPS,
  HARVEST_LEVELS,
  newHarvest,
  harvestSwap,
  harvestHint,
  harvestStars,
  shuffleHarvest,
  restoreHarvest,
} from "../engines/harvest.js";
import { cropSVG } from "../crops.js";
import { get, set, record } from "../store.js";
import { raceResult } from "./driving.js";
export function mount(root, ctx) {
  const events = listen();
  const savedProgress = get("harvest-progress");
  const progress = {
    unlocked: Number.isInteger(savedProgress?.unlocked)
      ? Math.max(1, Math.min(24, savedProgress.unlocked))
      : 1,
    stars: Array.from({ length: 24 }, (_, i) =>
      Number.isInteger(savedProgress?.stars?.[i])
        ? Math.max(0, Math.min(3, savedProgress.stars[i]))
        : 0,
    ),
  };
  let world =
      restoreHarvest(get("harvest-save")) ||
      newHarvest(1, get("harvest-mode", "normal")),
    state = "ready",
    selected = null,
    hints = [],
    focusCell = 0,
    busy = false,
    timer,
    destroyed = false,
    origin = null;
  const ui = frame(
    root,
    {
      stats: [
        ["Level", world.level, "level"],
        ["Moves", world.moves, "moves"],
        ["Score", world.score, "score"],
      ],
      options:
        '<label>Play <select id="harvest-mode"><option value="normal">Adventure · Limited moves</option><option value="relaxed">Relaxed · Unlimited moves</option></select></label><button class="button secondary small" id="harvest-map" aria-expanded="false">Level map</button>',
      body: '<div class="harvest-goals" aria-label="Harvest goals"></div><div class="harvest-board" id="game-board" role="group" aria-label="Crop garden. Select adjacent crops to swap, or swipe. Arrow keys navigate, Enter selects."></div><p class="harvest-tip" id="harvest-tip"></p><section class="harvest-map" id="level-map" hidden aria-label="Choose a level"><h3>Your little farm journey</h3><p>Stars are earned in Adventure. Relaxed also unlocks the next level.</p><div class="harvest-levels"></div></section>',
      controls:
        '<button class="button primary" id="game-start">Start harvesting</button><button class="button secondary" id="harvest-hint">Hint</button><button class="button secondary" id="harvest-shuffle">Shuffle · 1 left</button>',
      note: "Tap two neighboring crops or swipe to swap · Arrows + Enter select · Mode changes restart this level",
    },
    ctx,
  );
  ui.el(".game-options").classList.add("journey-options");
  const board = ui.el("#game-board");
  board.innerHTML = Array.from(
    { length: 49 },
    (_, i) =>
      `<button class="crop-cell" data-crop="${i}" tabindex="${i ? -1 : 0}"></button>`,
  ).join("");
  function save() {
    set("harvest-save", world);
    set("harvest-mode", world.mode);
  }
  function map() {
    ui.el(".harvest-levels").innerHTML = HARVEST_LEVELS.map(
      (l) =>
        `<button data-level="${l.id}" ${l.id > progress.unlocked ? "disabled" : ""} aria-label="Level ${l.id}, ${l.name}${l.id > progress.unlocked ? ", locked" : ""}" ${l.id === world.level ? 'aria-current="step"' : ""}><strong>${l.id}</strong><small>${"★".repeat(progress.stars[l.id - 1]) || (l.id > progress.unlocked ? "Locked" : "Play")}</small></button>`,
    ).join("");
  }
  function render() {
    const config = HARVEST_LEVELS[world.level - 1];
    ui.stat("level", `${world.level} / 24`);
    ui.stat("moves", world.mode === "relaxed" ? "∞" : world.moves);
    ui.stat("score", world.score);
    ui.el("#harvest-mode").value = world.mode;
    ui.el(".harvest-goals").innerHTML =
      config.targets
        .map((n, i) =>
          n
            ? `<div class="harvest-goal ${world.collected[i] >= n ? "complete" : ""}" aria-label="${CROPS[i].name}: ${Math.min(n, world.collected[i])} of ${n}">${cropSVG(i)}<span>${Math.min(n, world.collected[i])}<small> / ${n}</small></span></div>`
            : "",
        )
        .join("") +
      (config.patches
        ? `<div class="harvest-goal ${world.grass.some(Boolean) ? "" : "complete"}"><span class="grass-icon" aria-hidden="true">♧</span><span>${world.grass.filter(Boolean).length}<small> patches left</small></span></div>`
        : "");
    [...board.children].forEach((b, i) => {
      const c = world.board[i],
        html =
          cropSVG(c.type) +
          (c.special
            ? `<span class="crop-special" aria-hidden="true">${c.special === "color" ? "✦" : c.special === "row" ? "↔" : "↕"}</span>`
            : "");
      if (b.innerHTML !== html) b.innerHTML = html;
      b.classList.toggle("selected", selected === i);
      b.classList.toggle("hinted", hints.includes(i));
      b.classList.toggle("garden-patch", world.grass[i] > 0);
      b.classList.toggle("thick-patch", world.grass[i] === 2);
      b.classList.remove("clearing");
      b.disabled = state !== "playing" || busy || world.status !== "playing";
      b.setAttribute(
        "aria-label",
        `Row ${Math.floor(i / 7) + 1}, column ${(i % 7) + 1}: ${CROPS[c.type].name}${c.special ? ", " + c.special + " special" : ""}${world.grass[i] ? ", garden patch, " + world.grass[i] + " layers" : ""}`,
      );
      b.setAttribute("aria-pressed", String(selected === i));
      b.tabIndex = i === focusCell ? 0 : -1;
    });
    board.classList.toggle("harvest-paused", state === "paused");
    ui.el("#game-start").textContent =
      world.status !== "playing"
        ? "Play this level again"
        : state === "playing"
          ? "Pause"
          : state === "paused"
            ? "Resume"
            : world.turns
              ? "Continue level"
              : "Start harvesting";
    ui.el("#harvest-hint").disabled =
      state !== "playing" || busy || world.status !== "playing";
    ui.el("#harvest-shuffle").disabled =
      state !== "playing" ||
      busy ||
      !world.shuffles ||
      world.status !== "playing";
    ui.el("#harvest-shuffle").textContent = `Shuffle · ${world.shuffles} left`;
    ui.el("#harvest-tip").textContent =
      state === "paused"
        ? "Paused. Select Resume whenever you are ready."
        : world.level === 1 && !world.turns
          ? "First harvest: swap the glowing carrot in row 1 with the strawberry just below it."
          : `${config.name} · ${world.mode === "relaxed" ? "Take your time. Every crop counts." : "Collect the goals before your moves run out."}${config.patches ? " Match crops on green patches to clear each layer." : ""}`;
  }
  function finish() {
    if (world.status === "playing") return;
    const won = world.status === "won";
    if (won) {
      const stars = harvestStars(world);
      progress.unlocked = Math.max(
        progress.unlocked,
        Math.min(24, world.level + 1),
      );
      progress.stars[world.level - 1] = Math.max(
        progress.stars[world.level - 1],
        stars,
      );
      set("harvest-progress", progress);
      if (world.mode === "normal")
        record(`harvest-${world.level}`, world.score);
      map();
    }
    ctx.sound(won ? "win" : "lose");
    raceResult(
      board,
      won ? "A lovely little harvest." : "Another harvest awaits.",
      won
        ? `${world.mode === "normal" ? "★".repeat(harvestStars(world)) + " · " : "Relaxed complete · "}${world.score} points. ${world.level === 24 ? "You reached the end of the farm journey!" : "The next level is unlocked."}`
        : "Try matching four crops for a special. Your farm progress is safe.",
      won
        ? [
            [
              world.level < 24 ? "Next level" : "Play again",
              () =>
                startLevel(world.level < 24 ? world.level + 1 : 1, world.mode),
            ],
          ]
        : [
            ["Try again", restart],
            ["Try Relaxed", () => startLevel(world.level, "relaxed")],
          ],
    );
  }
  function settle() {
    clearTimeout(timer);
    busy = false;
    render();
    save();
    finish();
  }
  function move(a, b) {
    if (busy || state !== "playing" || world.status !== "playing") return;
    const result = harvestSwap(world, a, b);
    if (!result) {
      selected = b >= 0 && b < 49 ? b : a;
      hints = [];
      render();
      ui.say("That swap makes no match. No move spent. Try another pair.");
      return;
    }
    selected = null;
    hints = [];
    world = result.world;
    busy = true;
    save();
    for (const i of result.frames[0].cleared)
      board.children[i].classList.add("clearing");
    board.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const combos = result.frames.length;
    ui.say(
      `${combos > 1 ? `${combos}-step cascade! ` : "Lovely match! "}${world.score} points.`,
    );
    ctx.sound(combos > 1 ? "win" : "tap");
    const reduced =
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reduce-motion");
    timer = setTimeout(
      () => {
        if (!destroyed) settle();
      },
      reduced ? 30 : 230,
    );
  }
  function choose(i) {
    if (state !== "playing" || busy || world.status !== "playing") return;
    if (selected === i) selected = null;
    else if (
      selected !== null &&
      Math.abs((selected % 7) - (i % 7)) +
        Math.abs(Math.floor(selected / 7) - Math.floor(i / 7)) ===
        1
    ) {
      move(selected, i);
      return;
    } else selected = i;
    hints = [];
    render();
  }
  function startLevel(level, mode = world.mode) {
    clearTimeout(timer);
    busy = false;
    world = newHarvest(level, mode);
    state = "playing";
    selected = null;
    hints = level === 1 ? [1, 8] : [];
    root.querySelector(".race-result")?.remove();
    focusCell = 0;
    ui.el("#level-map").hidden = true;
    ui.el("#harvest-map").setAttribute("aria-expanded", "false");
    render();
    map();
    save();
    board.children[0].focus({ preventScroll: true });
  }
  function restart() {
    startLevel(world.level);
  }
  function pause() {
    if (state !== "playing" || world.status !== "playing") return;
    state = "paused";
    if (busy) settle();
    else {
      render();
      save();
    }
  }
  events.on(ui.el("#game-start"), "click", () => {
    if (world.status !== "playing") restart();
    else if (state === "playing") pause();
    else {
      state = "playing";
      if (!world.turns && world.level === 1) hints = [1, 8];
      render();
    }
  });
  events.on(ui.el("#harvest-hint"), "click", () => {
    hints = harvestHint(world) || [];
    selected = null;
    render();
    ui.say("Swap the two outlined crops. Hints do not cost moves.");
  });
  events.on(ui.el("#harvest-shuffle"), "click", () => {
    const next = shuffleHarvest(world);
    if (next) {
      world = next;
      selected = null;
      hints = [];
      render();
      save();
      ui.say(
        "Fresh crops, same goals and moves. Your one free shuffle is used.",
      );
    }
  });
  events.on(ui.el("#harvest-mode"), "change", (e) =>
    startLevel(world.level, e.target.value),
  );
  events.on(ui.el("#harvest-map"), "click", () => {
    pause();
    const area = ui.el("#level-map");
    area.hidden = !area.hidden;
    ui.el("#harvest-map").setAttribute("aria-expanded", String(!area.hidden));
  });
  events.on(ui.el(".harvest-levels"), "click", (e) => {
    const b = e.target.closest("[data-level]");
    if (b && !b.disabled) startLevel(Number(b.dataset.level));
  });
  events.on(board, "click", (e) => {
    const b = e.target.closest("[data-crop]");
    if (b && e.detail === 0) choose(Number(b.dataset.crop));
  });
  events.on(board, "keydown", (e) => {
    const b = e.target.closest("[data-crop]");
    if (!b) return;
    const i = Number(b.dataset.crop);
    let next = i;
    if (e.key === "ArrowLeft") next = Math.max(i - (i % 7), i - 1);
    else if (e.key === "ArrowRight") next = Math.min(i - (i % 7) + 6, i + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, i - 7);
    else if (e.key === "ArrowDown") next = Math.min(48, i + 7);
    else if (e.key === "Escape") {
      selected = null;
      render();
      return;
    } else return;
    e.preventDefault();
    focusCell = next;
    b.tabIndex = -1;
    board.children[next].tabIndex = 0;
    board.children[next].focus();
  });
  events.on(board, "pointerdown", (e) => {
    const b = e.target.closest("[data-crop]");
    if (b && !b.disabled && e.button === 0 && !origin) {
      origin = {
        id: e.pointerId,
        i: Number(b.dataset.crop),
        x: e.clientX,
        y: e.clientY,
      };
      board.setPointerCapture(e.pointerId);
    }
  });
  events.on(board, "pointerup", (e) => {
    if (!origin || origin.id !== e.pointerId) return;
    const { i, x, y } = origin;
    origin = null;
    const dx = e.clientX - x,
      dy = e.clientY - y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
      choose(i);
      return;
    }
    const next =
      Math.abs(dx) > Math.abs(dy) ? i + Math.sign(dx) : i + 7 * Math.sign(dy);
    move(i, next);
  });
  events.on(board, "pointercancel", () => (origin = null));
  events.on(window, "blur", pause);
  hints = world.level === 1 && !world.turns ? [1, 8] : [];
  render();
  map();
  if (world.status !== "playing") finish();
  return {
    restart,
    pause,
    isPlaying: () => world.status === "playing" && world.turns > 0,
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      events.destroy();
      save();
    },
  };
}
