import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import {
  STACK_MODES,
  newStack,
  stepStack,
  dropStack,
} from "../engines/stack.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let mode = Object.hasOwn(STACK_MODES, get("stack-mode"))
      ? get("stack-mode")
      : "relaxed",
    world = newStack(mode),
    state = "ready",
    raf,
    last = 0,
    destroyed = false,
    falling = [],
    lastMessage = "";
  const ui = frame(
    root,
    {
      stats: [
        ["Height", 0, "height"],
        ["Best", get("best:stack-" + mode, 0), "best"],
        ["Perfect streak", 0, "streak"],
      ],
      options: `<label>Pace <select id="stack-mode">${Object.entries(
        STACK_MODES,
      )
        .map(([id, m]) => `<option value="${id}">${m.label}</option>`)
        .join("")}</select></label>`,
      body: '<div class="canvas-wrap stack-wrap" id="game-board" tabindex="0" role="group" aria-label="Piku Stack. Tap or press Space to drop the moving block onto your tower."><canvas width="800" height="800" aria-hidden="true"></canvas></div>',
      controls:
        '<button class="button primary" id="game-start">Start stacking</button><button class="button secondary" id="stack-pause" disabled>Pause</button>',
      note: "Tap the tower or press Space / Enter to drop · Perfect drops recover a little width · P to pause",
    },
    ctx,
  );
  const area = ui.el("#game-board"),
    canvas = ui.el("canvas"),
    g = canvas.getContext("2d"),
    motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  g.scale(2, 2);
  ui.el("#stack-mode").value = mode;
  const colors = [
    "#d3b4eb",
    "#b9a3df",
    "#a9bce6",
    "#9ed1d1",
    "#b3d8a5",
    "#dbdf9d",
    "#e9c298",
    "#e5ab9b",
  ];
  function update() {
    ui.stat("height", world.height);
    ui.stat("best", get("best:stack-" + mode, 0));
    ui.stat("streak", world.combo);
    ui.el("#game-start").textContent =
      state === "ready"
        ? "Start stacking"
        : state === "paused"
          ? "Resume"
          : state === "done"
            ? "Play again"
            : "Drop block";
    ui.el("#stack-pause").disabled = state !== "playing";
  }
  function brick(x, y, w, color, alpha = 1) {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, w, 21, 3);
    g.fill();
    g.fillStyle = "#ffffff22";
    g.fillRect(x + 1, y + 1, Math.max(0, w - 2), 4);
    g.fillStyle = "#00000018";
    g.fillRect(x + 1, y + 17, Math.max(0, w - 2), 3);
    g.globalAlpha = 1;
  }
  function draw() {
    g.fillStyle = "#202538";
    g.fillRect(0, 0, 400, 400);
    g.fillStyle = "#303b52";
    g.beginPath();
    g.moveTo(0, 345);
    g.quadraticCurveTo(100, 205, 205, 345);
    g.quadraticCurveTo(315, 220, 400, 345);
    g.fill();
    g.fillStyle = "#aab58d";
    g.beginPath();
    g.arc(330, 54, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#d3ddc344";
    for (let i = 0; i < 12; i++) {
      g.beginPath();
      g.arc(20 + ((i * 37) % 360), 24 + ((i * 29) % 180), 1.5, 0, Math.PI * 2);
      g.fill();
    }
    const offset = Math.max(0, world.height - 9) * 22;
    world.blocks.forEach((b, i) => {
      const y = 350 - i * 22 + offset;
      if (y < -25 || y > 410) return;
      brick(b.x, y, b.w, colors[i % colors.length]);
    });
    if (state !== "done")
      brick(
        world.moving.x,
        350 - world.blocks.length * 22 + offset,
        world.moving.w,
        colors[world.blocks.length % colors.length],
      );
    for (const f of falling) brick(f.x, f.y, f.w, f.color, f.alpha);
    if (lastMessage && state === "playing") {
      g.fillStyle = "#e6f4be";
      g.font = "bold 15px Arial";
      g.textAlign = "center";
      g.fillText(lastMessage, 200, 32);
    }
  }
  function run() {
    if (state === "done") restart();
    state = "playing";
    last = 0;
    area.querySelector(".board-overlay")?.remove();
    update();
    area.focus({ preventScroll: true });
    ui.say("Wait for the moving block to line up, then drop.");
  }
  function restart() {
    world = newStack(mode);
    state = "ready";
    falling = [];
    last = 0;
    lastMessage = "";
    area.querySelector(".board-overlay")?.remove();
    update();
    draw();
    resultOverlay(
      area,
      "A little higher. A little happier.",
      "Line up each block. Find your rhythm. Build your little skyline.",
      run,
      "Start stacking",
    );
    ui.say("Ready to build. Choose Start stacking.");
  }
  function drop() {
    if (document.querySelector("dialog[open]")) return;
    if (state === "ready") {
      run();
      return;
    }
    if (state !== "playing") return;
    const offset = Math.max(0, world.height - 9) * 22,
      y = 350 - world.blocks.length * 22 + offset,
      result = dropStack(world);
    world = result.state;
    if (world.dead) {
      state = "done";
      record("stack-" + mode, world.height);
      update();
      draw();
      ctx.sound("lose");
      resultOverlay(
        area,
        "That was a lovely little tower.",
        `${world.height} ${world.height === 1 ? "floor" : "floors"} · Best ${get("best:stack-" + mode, 0)}. Ready to rise again?`,
        () => {
          restart();
          run();
        },
      );
      ui.say(
        `Tower complete. ${world.height} floors. Select Play again for a fresh tower.`,
      );
      return;
    }
    record("stack-" + mode, world.height);
    if (
      !motion.matches &&
      !document.documentElement.classList.contains("reduce-motion")
    )
      for (const cut of result.cuts)
        falling.push({
          ...cut,
          y,
          vy: 0,
          color: colors[world.height % colors.length],
          alpha: 1,
        });
    lastMessage = result.perfect
      ? `Perfect! ${world.combo > 1 ? "×" + world.combo : ""}`
      : "A little higher.";
    ctx.sound(result.perfect ? "win" : "tap");
    update();
    draw();
    ui.say(
      `${result.perfect ? "Perfect drop! " : ""}${world.height} floors.${result.perfect ? " A little width restored." : ""}`,
    );
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    update();
    resultOverlay(
      area,
      "Let the skyline wait.",
      "Your tower is paused right here.",
      run,
      "Resume",
    );
    ui.say("Paused. Select Resume to continue.");
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.04) : 0;
    last = time;
    if (state === "playing") {
      world = stepStack(world, dt);
      for (const f of falling) {
        f.vy += 650 * dt;
        f.y += f.vy * dt;
        f.alpha = Math.max(0, f.alpha - dt);
      }
      falling = falling.filter((f) => f.y < 410 && f.alpha > 0);
      draw();
    }
    raf = requestAnimationFrame(loop);
  }
  events.on(ui.el("#game-start"), "click", () =>
    state === "paused" ? run() : state === "done" ? (restart(), run()) : drop(),
  );
  events.on(ui.el("#stack-pause"), "click", pause);
  events.on(area, "pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    e.preventDefault();
    area.focus({ preventScroll: true });
    drop();
  });
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      drop();
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      state === "paused" ? run() : pause();
    }
  });
  events.on(window, "blur", pause);
  events.on(ui.el("#stack-mode"), "change", (e) => {
    if (state === "playing" || state === "paused") {
      e.target.value = mode;
      ctx.toast("Restart first to change the pace.");
      return;
    }
    mode = e.target.value;
    set("stack-mode", mode);
    restart();
  });
  restart();
  raf = requestAnimationFrame(loop);
  return {
    restart,
    pause,
    isPlaying: () => state === "playing" || state === "paused",
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
