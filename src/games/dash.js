import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import {
  DASH,
  newDash,
  jumpDash,
  stepDash,
  dashScore,
} from "../engines/dash.js";
import { get, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let state = "ready",
    world = newDash(),
    raf,
    last = 0,
    destroyed = false,
    lastScore = -1,
    lastStars = -1,
    lastControls = "";
  const ui = frame(
    root,
    {
      stats: [
        ["Score", 0, "score"],
        ["Best", get("best:dash", 0), "best"],
        ["Stars", 0, "stars"],
      ],
      body: '<div class="canvas-wrap dash-wrap" id="game-board" tabindex="0" role="group" aria-label="Piku Dash running game. Tap or press Space to jump, and again to double jump."><canvas width="1200" height="600" aria-hidden="true"></canvas></div>',
      controls:
        '<button class="button primary" id="game-start">Start running</button><button class="button secondary" id="jump" disabled>Jump ↑</button>',
      note: "Tap the game or press Space / ↑ to jump · Jump again in the air · P to pause",
    },
    ctx,
  );
  const area = ui.el("#game-board"),
    canvas = ui.el("canvas"),
    g = canvas.getContext("2d"),
    startButton = ui.el("#game-start"),
    jumpButton = ui.el("#jump");
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  g.scale(2, 2);
  function update() {
    const score = dashScore(world);
    if (score !== lastScore) {
      ui.stat("score", score);
      ui.stat("best", Math.max(get("best:dash", 0), score));
      lastScore = score;
    }
    if (world.collected !== lastStars) {
      ui.stat("stars", world.collected);
      lastStars = world.collected;
    }
    const controlsKey = `${state}:${world.jumps}`;
    if (controlsKey === lastControls) return;
    lastControls = controlsKey;
    startButton.textContent =
      state === "ready"
        ? "Start running"
        : state === "playing"
          ? "Pause"
          : state === "paused"
            ? "Resume"
            : "Play again";
    jumpButton.disabled = state !== "playing";
    jumpButton.textContent =
      world.jumps >= 2
        ? "Land to recharge"
        : world.jumps === 1
          ? "Jump again ↑"
          : "Jump ↑";
  }
  function roundRect(x, y, w, h, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  }
  function draw() {
    const reduced =
      document.documentElement.classList.contains("reduce-motion") ||
      motionPreference.matches;
    g.fillStyle = "#172731";
    g.fillRect(0, 0, 600, 300);
    g.fillStyle = "#425457";
    for (let i = 0; i < 15; i++) {
      const x =
        (((i * 97 + 25 - (reduced ? 0 : world.distance * 0.12)) % 620) + 620) %
        620;
      g.beginPath();
      g.arc(x, 25 + ((i * 37) % 120), i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#f0e4bc";
    g.beginPath();
    g.arc(498, 53, 19, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#172731";
    g.beginPath();
    g.arc(506, 46, 17, 0, Math.PI * 2);
    g.fill();
    const drift = reduced ? 0 : world.distance * 0.15;
    g.fillStyle = "#223d40";
    for (let i = -1; i < 6; i++) {
      const x = i * 170 - (drift % 170);
      g.beginPath();
      g.moveTo(x, 246);
      g.quadraticCurveTo(x + 85, 122 + (i % 2) * 28, x + 170, 246);
      g.fill();
    }
    g.fillStyle = "#2d4a40";
    g.fillRect(0, DASH.ground, 600, 54);
    g.fillStyle = "#9abc6d";
    g.fillRect(0, DASH.ground, 600, 3);
    g.fillStyle = "#486242";
    for (let i = 0; i < 25; i++) {
      const x = i * 29 - (world.distance % 29);
      g.fillRect(x, 267 + (i % 3) * 7, 10, 2);
    }
    for (const coin of world.coins) {
      g.save();
      g.translate(coin.x, coin.y);
      g.fillStyle = "#f7d77b";
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 4 : 9;
        const x = Math.cos(angle) * r,
          y = Math.sin(angle) * r;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
      g.fill();
      g.restore();
    }
    for (const o of world.obstacles) {
      roundRect(o.x, DASH.ground - o.h, o.w, o.h, 5, "#e79b85");
      g.fillStyle = "#f7c0a6";
      g.fillRect(o.x + 5, DASH.ground - o.h + 7, Math.max(3, o.w - 10), 4);
    }
    const x = DASH.x,
      y = world.y,
      bob =
        world.jumps === 0 && state === "playing" && !reduced
          ? Math.sin(world.time * 20) * 1.5
          : 0;
    roundRect(x + 4, y - 10 + bob, 7, 17, 3, "#c7f36b");
    roundRect(x + 18, y - 14 + bob, 7, 20, 3, "#c7f36b");
    roundRect(x, y + bob, DASH.w, DASH.h, 9, "#c7f36b");
    roundRect(x + 17, y + 10 + bob, 4, 5, 2, "#243b32");
    roundRect(x + 25, y + 12 + bob, 3, 4, 1, "#243b32");
    g.fillStyle = "#7c9c52";
    g.fillRect(x + 17, y + 23 + bob, 9, 2);
    if (world.jumps === 0) {
      const stride =
        state === "playing" && !reduced ? Math.sin(world.time * 20) * 3 : 0;
      roundRect(x + 3, y + 32, 8, 7 + stride, 2, "#a6ca5d");
      roundRect(x + 20, y + 32, 8, 7 - stride, 2, "#a6ca5d");
    }
  }
  function saveBest() {
    record("dash", dashScore(world));
  }
  function run() {
    if (state === "done") restart();
    area.querySelector(".board-overlay")?.remove();
    state = "playing";
    last = 0;
    update();
    area.focus({ preventScroll: true });
    ui.say("Keep running! Jump once or twice to clear the coral obstacles.");
  }
  function restart() {
    world = newDash();
    state = "ready";
    last = 0;
    ((lastScore = -1), (lastStars = -1), (lastControls = ""));
    area.querySelector(".board-overlay")?.remove();
    draw();
    update();
    resultOverlay(
      area,
      "Ready, little runner?",
      "Jump over coral blocks. Catch stars. Find your rhythm.",
      run,
      "Start running",
    );
    ui.say("Ready. Tap Start running when you are.");
  }
  function jump() {
    if (document.querySelector("dialog[open]")) return;
    if (state === "ready") run();
    if (state !== "playing") return;
    const next = jumpDash(world);
    if (next !== world) {
      world = next;
      ctx.sound();
    }
  }
  function pause() {
    if (state !== "playing") return;
    saveBest();
    state = "paused";
    update();
    resultOverlay(
      area,
      "Catch your breath.",
      "Your adventure will wait right here.",
      run,
      "Resume",
    );
    ui.say("Paused. Select Resume to continue.");
  }
  function finish() {
    state = "done";
    saveBest();
    update();
    ctx.sound("lose");
    resultOverlay(
      area,
      "One more run?",
      `${dashScore(world)} points · ${world.collected} stars · ${world.passed} obstacles cleared.`,
      () => {
        restart();
        run();
      },
    );
    ui.say(
      `Run complete. ${dashScore(world)} points and ${world.collected} stars. Select Play again for a fresh start.`,
    );
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.04) : 0;
    last = time;
    if (state === "playing") {
      const previousStars = world.collected;
      for (let i = 0; i < 4 && !world.dead; i++)
        world = stepDash(world, dt / 4);
      if (world.collected > previousStars) ctx.sound("win");
      draw();
      update();
      if (world.dead) finish();
    }
    raf = requestAnimationFrame(loop);
  }
  events.on(startButton, "click", () =>
    state === "playing" ? pause() : run(),
  );
  events.on(jumpButton, "click", jump);
  events.on(area, "pointerdown", (e) => {
    if (e.target.closest("button") || e.button !== 0) return;
    e.preventDefault();
    area.focus({ preventScroll: true });
    jump();
  });
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (e.code === "Space" || e.key === "ArrowUp") {
      e.preventDefault();
      jump();
    } else if (e.key.toLowerCase() === "p" || e.key === "Escape") {
      e.preventDefault();
      if (state === "paused") run();
      else pause();
    }
  });
  events.on(window, "blur", pause);
  restart();
  raf = requestAnimationFrame(loop);
  return {
    restart,
    pause,
    isPlaying: () => state === "playing" || state === "paused",
    destroy: () => {
      destroyed = true;
      saveBest();
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
