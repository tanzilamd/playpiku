import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import { raceResult } from "./driving.js";
import {
  BUBBLE_LEVELS,
  BUBBLE_COLORS,
  bubbleCenter,
  newBubble,
  traceBubble,
  settleBubble,
  restoreBubble,
} from "../engines/bubble.js";
import { get, set, record } from "../store.js";
const symbols = ["●", "✦", "▲", "♥", "◆"];
export function mount(root, ctx) {
  const events = listen(),
    saved = restoreBubble(get("bubble-save")),
    raw = get("bubble-progress", {});
  const progress = {
    unlocked: Number.isInteger(raw?.unlocked)
      ? Math.max(1, Math.min(BUBBLE_LEVELS, raw.unlocked))
      : 1,
    stars: Array.from({ length: BUBBLE_LEVELS }, (_, i) =>
      Math.max(0, Math.min(3, Number(raw?.stars?.[i]) || 0)),
    ),
  };
  let world = saved || newBubble(),
    state = "ready",
    resuming = !!saved,
    angle = 0,
    flight = null,
    particles = [],
    last = 0,
    raf,
    destroyed = false,
    aimPointer = null,
    guideCache = null;
  const ui = frame(
    root,
    {
      stats: [
        ["Level", world.level, "level"],
        ["Score", world.score, "score"],
        ["Shots left", world.shots, "shots"],
      ],
      options: `<label>Garden <select id="bubble-level">${Array.from({ length: BUBBLE_LEVELS }, (_, i) => `<option value="${i + 1}" ${i + 1 > progress.unlocked ? "disabled" : ""}>${i + 1}${progress.stars[i] ? " · " + "★".repeat(progress.stars[i]) : ""}${i + 1 > progress.unlocked ? " · Locked" : ""}</option>`).join("")}</select></label><label class="guide-toggle"><input type="checkbox" id="bubble-guide" checked> Aim guide</label>`,
      body: '<div class="canvas-wrap arcade-tall bubble-wrap" id="game-board" tabindex="0" role="group" aria-label="Bubble Pop board. Aim with left and right arrows, then press Space to shoot. Matching symbols also identify bubble colors."><canvas width="800" height="1160" aria-hidden="true"></canvas></div>',
      controls:
        '<button class="button primary" id="game-start">Start popping</button><button class="button secondary" id="bubble-swap">Swap balls</button><button class="button secondary" id="bubble-pause" disabled>Pause</button><div class="bubble-aim"><label for="bubble-angle">Aim <span id="aim-label">0°</span></label><input id="bubble-angle" type="range" min="-77" max="77" value="0" aria-label="Aim angle"></div><div class="bubble-ammo" aria-label="Your next bubbles"><span>Now <b id="bubble-current"></b></span><span>Next <b id="bubble-next"></b></span></div>',
      note: "Drag on the board and release to shoot · ← / → to aim · Space to shoot · X to swap · P to pause",
    },
    ctx,
  );
  const area = ui.el("#game-board"),
    canvas = ui.el("canvas"),
    g = canvas.getContext("2d");
  g.scale(2, 2);
  ui.el("#bubble-level").value = world.level;
  function save() {
    if (world.status === "playing") set("bubble-save", world);
    else set("bubble-save", null);
  }
  function bubble(x, y, color, r = 18, alpha = 1) {
    g.globalAlpha = alpha;
    g.fillStyle = BUBBLE_COLORS[color];
    g.beginPath();
    g.arc(x, y, r - 1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff55";
    g.beginPath();
    g.arc(x - 5, y - 6, r * 0.24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#233742";
    g.font = `bold ${r * 0.72}px Arial`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(symbols[color], x, y + 1);
    g.globalAlpha = 1;
  }
  function update() {
    ui.stat("level", `${world.level} / ${BUBBLE_LEVELS}`);
    ui.stat("score", world.score);
    ui.stat("shots", world.shots);
    ui.el("#game-start").textContent =
      state === "ready"
        ? resuming
          ? "Resume garden"
          : "Start popping"
        : state === "paused"
          ? "Resume"
          : state === "done"
            ? "Try again"
            : "Shoot bubble";
    ui.el("#game-start").disabled = !!flight && state === "playing";
    ui.el("#bubble-pause").disabled = state !== "playing";
    ui.el("#bubble-swap").disabled = !!flight || state !== "playing";
    ui.el("#bubble-angle").disabled = !!flight || state === "done";
    ui.el("#bubble-level").disabled = !!flight;
    for (const [id, c] of [
      ["bubble-current", world.current],
      ["bubble-next", world.next],
    ]) {
      const b = ui.el("#" + id);
      b.textContent = symbols[c];
      b.style.background = BUBBLE_COLORS[c];
    }
    area.dataset.state = state;
    area.dataset.bubbles = world.board.length;
  }
  function guide() {
    if (
      !guideCache ||
      guideCache.board !== world.board ||
      guideCache.angle !== angle
    )
      guideCache = {
        board: world.board,
        angle,
        result: traceBubble(world.board, angle),
      };
    return guideCache.result;
  }
  function draw() {
    g.fillStyle = "#1b303d";
    g.fillRect(0, 0, 400, 580);
    g.strokeStyle = "#3a5260";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(19, 23);
    g.lineTo(19, 456);
    g.moveTo(381, 23);
    g.lineTo(381, 456);
    g.stroke();
    g.strokeStyle = "#e7a08c77";
    g.setLineDash([5, 7]);
    g.beginPath();
    g.moveTo(22, 438);
    g.lineTo(378, 438);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#b5c9c3";
    g.textAlign = "center";
    g.font = "11px Arial";
    g.fillText("KEEP THE BUBBLES ABOVE THE LINE", 200, 458);
    for (const b of world.board) {
      const p = bubbleCenter(b.row, b.col);
      bubble(p.x, p.y, b.color);
    }
    if (state === "playing" && !flight && ui.el("#bubble-guide").checked) {
      const t = guide();
      g.strokeStyle = "#d6eed077";
      g.lineWidth = 2;
      g.setLineDash([3, 8]);
      g.beginPath();
      t.path.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
      g.setLineDash([]);
      if (t.cell) {
        const p = bubbleCenter(t.cell.row, t.cell.col);
        g.strokeStyle = "#e5f4d488";
        g.beginPath();
        g.arc(p.x, p.y, 17, 0, Math.PI * 2);
        g.stroke();
      }
    }
    g.save();
    g.translate(200, 540);
    g.rotate(angle);
    g.fillStyle = "#9cbab4";
    g.beginPath();
    g.roundRect(-12, -36, 24, 42, 7);
    g.fill();
    g.restore();
    bubble(200, 524, world.current);
    g.fillStyle = "#759c92";
    g.beginPath();
    g.ellipse(200, 555, 32, 8, 0, 0, Math.PI * 2);
    g.fill();
    if (flight) bubble(flight.x, flight.y, flight.color);
    for (const p of particles)
      bubble(p.x, p.y, p.color, Math.max(3, 18 * p.life), p.life);
  }
  function run() {
    if (state === "done") {
      restart();
    }
    state = "playing";
    last = 0;
    area.querySelector(".board-overlay")?.remove();
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    area.focus({ preventScroll: true });
    ui.say("Aim for three matching colors or symbols. Release to shoot.");
  }
  function restart(level = world.level) {
    resuming = false;
    world = newBubble(level);
    state = "ready";
    flight = null;
    particles = [];
    aimPointer = null;
    save();
    ui.el("#bubble-level").value = level;
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    resultOverlay(
      area,
      "A little aim. A lovely pop.",
      "Match 3 colors or symbols. Drop hanging bubbles for bigger combos.",
      run,
      "Start popping",
    );
    ui.say("Ready. Clear the garden before your shots run out.");
  }
  function finish() {
    state = "done";
    set("bubble-save", null);
    record("bubble", world.score);
    update();
    draw();
    const won = world.status === "won";
    if (won) {
      const stars = world.shots >= 12 ? 3 : world.shots >= 5 ? 2 : 1;
      progress.stars[world.level - 1] = Math.max(
        progress.stars[world.level - 1],
        stars,
      );
      progress.unlocked = Math.min(
        BUBBLE_LEVELS,
        Math.max(progress.unlocked, world.level + 1),
      );
      set("bubble-progress", progress);
      for (const o of ui.el("#bubble-level").options) {
        o.disabled = Number(o.value) > progress.unlocked;
        const n = Number(o.value);
        o.textContent = `${n}${progress.stars[n - 1] ? " · " + "★".repeat(progress.stars[n - 1]) : ""}${o.disabled ? " · Locked" : ""}`;
      }
    }
    ctx.sound(won ? "win" : "lose");
    const actions =
      won && world.level < BUBBLE_LEVELS
        ? [
            [
              "Next garden",
              () => {
                restart(world.level + 1);
                run();
              },
            ],
            [
              "Replay garden",
              () => {
                restart();
                run();
              },
            ],
          ]
        : [
            [
              "Play again",
              () => {
                restart();
                run();
              },
            ],
          ];
    raceResult(
      area,
      won
        ? world.level === BUBBLE_LEVELS
          ? "All twelve gardens are blooming!"
          : "A lovely little clear!"
        : "One more little try?",
      `${world.score} points · ${won ? "★".repeat(progress.stars[world.level - 1]) + " · " + world.shots + " shots left" : "Try swapping your next bubble or bouncing off a wall."}`,
      actions,
    );
    ui.say(
      won
        ? `Garden ${world.level} cleared. ${world.score} points.`
        : "Out of room or shots. Your unlocked gardens are safe.",
    );
  }
  function fire() {
    if (state === "ready" || state === "paused") {
      run();
      return;
    }
    if (state === "done") {
      restart();
      run();
      return;
    }
    if (state !== "playing" || flight) return;
    const t = guide();
    if (!t.cell) {
      world.status = "lost";
      finish();
      return;
    }
    flight = { ...t, color: world.current, x: 200, y: 524, index: 1 };
    update();
  }
  function swap() {
    if (state !== "playing" || flight) return;
    [world.current, world.next] = [world.next, world.current];
    save();
    update();
    draw();
    ctx.sound();
    ui.say("Bubbles swapped.");
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    aimPointer = null;
    save();
    update();
    resultOverlay(
      area,
      "A little breather.",
      "Your garden and shot are waiting right here.",
      run,
      "Resume",
    );
  }
  function aim(degrees) {
    angle = (Math.max(-77, Math.min(77, degrees)) * Math.PI) / 180;
    ui.el("#bubble-angle").value = Math.round((angle * 180) / Math.PI);
    ui.el("#aim-label").textContent = `${Math.round((angle * 180) / Math.PI)}°`;
    draw();
  }
  function pointerAim(e) {
    const r = canvas.getBoundingClientRect();
    aim(
      (Math.atan2(
        ((e.clientX - r.left) * 400) / r.width - 200,
        524 - ((e.clientY - r.top) * 580) / r.height,
      ) *
        180) /
        Math.PI,
    );
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min(0.04, (time - last) / 1000) : 0;
    last = time;
    if (state === "playing") {
      if (flight) {
        let travel = dt * 880;
        while (travel > 0 && flight) {
          const target = flight.path[flight.index],
            d = Math.hypot(target.x - flight.x, target.y - flight.y);
          if (d <= travel) {
            flight.x = target.x;
            flight.y = target.y;
            travel -= d;
            if (++flight.index >= flight.path.length) {
              const result = settleBubble(world, flight.cell);
              particles = [...result.popped, ...result.dropped].map((b) => ({
                ...bubbleCenter(b.row, b.col),
                color: b.color,
                life: 1,
                vy: 60 + Math.random() * 90,
              }));
              world = result.state;
              flight = null;
              save();
              if (world.status !== "playing") finish();
              else {
                update();
                ui.say(
                  result.popped.length
                    ? `${result.popped.length} popped, ${result.dropped.length} dropped! ${world.shots} shots left.`
                    : `${world.shots} shots left. Try a different angle.`,
                );
                ctx.sound(result.popped.length ? "win" : "tap");
              }
            }
          } else {
            flight.x += ((target.x - flight.x) / d) * travel;
            flight.y += ((target.y - flight.y) / d) * travel;
            travel = 0;
          }
        }
      }
      for (const p of particles) {
        p.y += p.vy * dt;
        p.life -= dt * 1.8;
      }
      particles = particles.filter((p) => p.life > 0);
      draw();
    }
    raf = requestAnimationFrame(loop);
  }
  events.on(ui.el("#game-start"), "click", fire);
  events.on(ui.el("#bubble-swap"), "click", swap);
  events.on(ui.el("#bubble-pause"), "click", pause);
  events.on(ui.el("#bubble-angle"), "input", (e) =>
    aim(Number(e.target.value)),
  );
  events.on(ui.el("#bubble-guide"), "change", draw);
  events.on(ui.el("#bubble-level"), "change", (e) => {
    const level = Number(e.target.value);
    if (level <= progress.unlocked) restart(level);
  });
  events.on(area, "pointerdown", (e) => {
    if (
      e.button !== 0 ||
      e.target.closest("button") ||
      state !== "playing" ||
      flight
    )
      return;
    e.preventDefault();
    aimPointer = e.pointerId;
    area.setPointerCapture(e.pointerId);
    pointerAim(e);
    area.focus({ preventScroll: true });
  });
  events.on(area, "pointermove", (e) => {
    if (e.pointerId === aimPointer) pointerAim(e);
  });
  events.on(area, "pointerup", (e) => {
    if (e.pointerId !== aimPointer) return;
    aimPointer = null;
    pointerAim(e);
    fire();
  });
  for (const name of ["pointercancel", "lostpointercapture"])
    events.on(area, name, () => {
      aimPointer = null;
    });
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      aim((angle * 180) / Math.PI + (e.key === "ArrowLeft" ? -3 : 3));
    } else if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      fire();
    } else if (e.key.toLowerCase() === "x") swap();
    else if (e.key.toLowerCase() === "p") state === "paused" ? run() : pause();
  });
  events.on(window, "blur", pause);
  update();
  draw();
  resultOverlay(
    area,
    saved ? "Your garden is waiting." : "A little aim. A lovely pop.",
    saved
      ? "Your settled board and remaining shots are saved."
      : "Match 3 colors or symbols. Clear the garden before your shots run out.",
    run,
    saved ? "Resume garden" : "Start popping",
  );
  raf = requestAnimationFrame(loop);
  return {
    restart: () => restart(),
    pause,
    isPlaying: () => state === "playing" || state === "paused",
    destroy: () => {
      save();
      destroyed = true;
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
