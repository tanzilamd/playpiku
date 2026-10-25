import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import { drivingInput, raceResult } from "./driving.js";
import { newMeteor, stepMeteor, METEOR_GUARDIANS } from "../engines/meteor.js";
import { get, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let world = newMeteor(),
    state = "ready",
    last = 0,
    raf,
    destroyed = false,
    drag = null,
    target = null,
    display = "",
    banner = "A little courage. A big little sky.",
    bannerTime = 0;
  const ui = frame(
    root,
    {
      stats: [
        ["Score", 0, "score"],
        ["Best", get("best:meteor", 0), "best"],
        ["Hull", "♥♥♥", "health"],
        ["Wave", 1, "wave"],
      ],
      body: '<div class="canvas-wrap arcade-tall meteor-wrap" id="game-board" tabindex="0" role="group" aria-label="Meteor space arena. Drag your spaceship or use arrow keys. Your ship fires automatically. Dodge coral shots and collect upgrades."><canvas width="800" height="1160" aria-hidden="true"></canvas></div>',
      controls:
        '<button class="button primary" id="game-start">Start flying</button><button class="button secondary" id="meteor-pause" disabled>Pause</button><div class="meteor-readout"><span>Shield <b id="shield">1</b></span><span>Weapon <b id="power">×1</b></span><span>Auto-fire <b>ON</b></span></div><div class="meteor-pad" aria-label="Ship direction controls"><button class="button secondary drive-button" data-drive="left" aria-label="Move ship left">←</button><button class="button secondary drive-button" data-drive="up" aria-label="Move ship up">↑</button><button class="button secondary drive-button" data-drive="down" aria-label="Move ship down">↓</button><button class="button secondary drive-button" data-drive="right" aria-label="Move ship right">→</button></div>',
      note: "Drag anywhere on the board to steer · Arrows / WASD also work · Auto-fire is always on · P to pause",
    },
    ctx,
  );
  const area = ui.el("#game-board"),
    canvas = ui.el("canvas"),
    g = canvas.getContext("2d");
  g.scale(2, 2);
  const input = drivingInput(
    root,
    events,
    {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
    },
    () => {
      target = null;
    },
  );
  function update() {
    const stamp = [
      world.score,
      world.wave,
      world.health,
      world.shield,
      world.power,
      state,
    ].join();
    if (stamp === display) return;
    display = stamp;
    ui.stat("score", world.score);
    ui.stat("best", Math.max(world.score, get("best:meteor", 0)));
    ui.stat("health", "♥".repeat(Math.max(0, world.health)) || "—");
    ui.stat("wave", world.wave);
    ui.el("#shield").textContent = world.shield;
    ui.el("#power").textContent = "×" + world.power;
    ui.el("#game-start").textContent =
      state === "ready"
        ? "Start flying"
        : state === "paused"
          ? "Resume"
          : state === "done"
            ? "Play again"
            : "Flying";
    ui.el("#game-start").disabled = state === "playing";
    ui.el("#meteor-pause").disabled = state !== "playing";
    area.dataset.state = state;
    area.dataset.wave = world.wave;
  }
  function circle(x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  function ship(x, y, color, scale = 1, enemy = false) {
    g.save();
    g.translate(x, y);
    g.scale(scale, enemy ? -scale : scale);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, -20);
    g.lineTo(18, 15);
    g.lineTo(5, 9);
    g.lineTo(0, 15);
    g.lineTo(-5, 9);
    g.lineTo(-18, 15);
    g.closePath();
    g.fill();
    g.fillStyle = "#324b64";
    g.beginPath();
    g.ellipse(0, -2, 5, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function draw() {
    g.fillStyle = "#17243b";
    g.fillRect(0, 0, 400, 580);
    g.fillStyle = "#20324d";
    g.beginPath();
    g.ellipse(345, 150, 125, 180, -0.7, 0, Math.PI * 2);
    g.fill();
    const reduced =
      get("motion", false) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (let i = 0; i < 60; i++) {
      const y =
        (i * 61 + (reduced ? 0 : world.time * (12 + (i % 4) * 5))) % 580;
      circle(
        (i * 97 + 13) % 400,
        y,
        i % 5 === 0 ? 1.6 : 0.8,
        i % 4 === 0 ? "#acc2d1" : "#546d86",
      );
    }
    for (const p of world.particles) {
      g.globalAlpha = p.life / 0.45;
      circle(p.x, p.y, 3, "#e9c994");
    }
    g.globalAlpha = 1;
    for (const e of world.enemies) {
      if (e.kind === "rock") {
        g.save();
        g.translate(e.x, e.y);
        g.rotate(e.age * 0.6);
        g.fillStyle = "#9c918d";
        g.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2,
            r = i % 2 ? e.r : e.r * 0.83;
          i
            ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
            : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
        circle(-6, -4, 4, "#6c6d75");
        circle(7, 6, 5, "#7f7b80");
        g.restore();
      } else ship(e.x, e.y, "#e6a28f", 1, true);
    }
    if (world.boss) {
      const b = world.boss,
        guardian = METEOR_GUARDIANS[b.variant || 0];
      if (b.warning) {
        g.strokeStyle = "#eec58c88";
        g.lineWidth = 2;
        g.setLineDash([5, 9]);
        g.beginPath();
        g.moveTo(b.x, b.y + 30);
        g.lineTo(b.warning.x, b.warning.y);
        g.stroke();
        g.setLineDash([]);
      }
      g.fillStyle = guardian.color;
      g.beginPath();
      g.roundRect(b.x - 43, b.y - 22, 86, 44, 14);
      g.fill();
      ship(
        b.x - 32,
        b.y + 12,
        guardian.color,
        b.variant === 2 ? 1.45 : 1.1,
        true,
      );
      ship(
        b.x + 32,
        b.y + 12,
        guardian.color,
        b.variant === 2 ? 1.45 : 1.1,
        true,
      );
      circle(b.x, b.y, 12, "#485175");
      circle(b.x, b.y, 5, "#f1d4a5");
      g.fillStyle = "#42435c";
      g.fillRect(60, 22, 280, 7);
      g.fillStyle = "#d8b5e5";
      g.fillRect(60, 22, 280 * Math.max(0, b.hp / b.maxHp), 7);
      g.fillStyle = "#e4d4ec";
      g.font = "bold 10px Arial";
      g.textAlign = "center";
      g.fillText(guardian.name.toUpperCase(), 200, 16);
    }
    for (const b of world.shots) {
      g.fillStyle = "#c7e8a5";
      g.beginPath();
      g.roundRect(b.x - 2, b.y - 6, 4, 13, 2);
      g.fill();
    }
    for (const b of world.hostile) {
      circle(b.x, b.y, b.r + 3, "#ed9d8433");
      circle(b.x, b.y, b.r, "#f2ad90");
    }
    for (const p of world.pickups) {
      circle(
        p.x,
        p.y,
        14,
        p.type === "power"
          ? "#e8d08d"
          : p.type === "repair"
            ? "#efb0a6"
            : "#a6d6df",
      );
      g.fillStyle = "#263b4c";
      g.font = "bold 15px Arial";
      g.textAlign = "center";
      g.fillText(
        p.type === "power" ? "↑" : p.type === "repair" ? "+" : "◇",
        p.x,
        p.y + 5,
      );
    }
    if (!world.invincible || Math.floor(world.time * 12) % 2 === 0) {
      if (world.shield) {
        g.strokeStyle = "#a4dbe688";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(world.ship.x, world.ship.y, 28, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = "#e8c58c";
      g.beginPath();
      g.moveTo(world.ship.x - 5, world.ship.y + 13);
      g.lineTo(
        world.ship.x,
        world.ship.y + 25 + (reduced ? 0 : Math.sin(world.time * 30) * 4),
      );
      g.lineTo(world.ship.x + 5, world.ship.y + 13);
      g.fill();
      ship(world.ship.x, world.ship.y, "#c7e8a5");
    }
    if (bannerTime > 0 || world.transition > 0) {
      g.fillStyle = "#102032cc";
      g.fillRect(25, 250, 350, 58);
      g.fillStyle = "#e9edce";
      g.font = "bold 16px Arial";
      g.textAlign = "center";
      g.fillText(
        world.transition > 0
          ? `Wave ${world.wave} clear! +1 shield next wave`
          : banner,
        200,
        285,
      );
    }
  }
  function run() {
    if (state === "done") restart();
    state = "playing";
    last = 0;
    input.clear();
    target = null;
    drag = null;
    area.querySelector(".board-overlay")?.remove();
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    area.focus({ preventScroll: true });
    ui.say(
      "Auto-fire is on. Dodge coral shots and collect shield, repair and weapon upgrades.",
    );
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    target = null;
    drag = null;
    input.clear();
    record("meteor", world.score);
    update();
    resultOverlay(
      area,
      "Let the stars wait.",
      "Your ship and this wave are paused right here.",
      run,
      "Resume",
    );
  }
  function restart() {
    world = newMeteor();
    state = "ready";
    last = 0;
    display = "";
    drag = null;
    target = null;
    input.clear();
    banner = "Wave 1 · Find your little orbit";
    bannerTime = 2.5;
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    resultOverlay(
      area,
      "Your little ship. A sky of possibilities.",
      "Drag to dodge. Your ship handles the shooting. Collect upgrades and meet a boss every third wave.",
      run,
      "Start flying",
    );
    ui.say("Ready to fly. Auto-fire is on, so focus on dodging.");
  }
  function finish() {
    state = "done";
    input.clear();
    target = null;
    drag = null;
    record("meteor", world.score);
    update();
    draw();
    ctx.sound("lose");
    raceResult(
      area,
      "A brave little flight.",
      `${world.score} points · Wave ${world.wave} · ${world.kills} enemies cleared · Best ${get("best:meteor", 0)}.`,
      [
        [
          "Fly again",
          () => {
            restart();
            run();
          },
        ],
      ],
    );
    ui.say(
      `Flight complete. ${world.score} points, wave ${world.wave}. Fly again for a fresh ship.`,
    );
  }
  function loop(t) {
    if (destroyed) return;
    const dt = last ? Math.min(0.04, (t - last) / 1000) : 0;
    last = t;
    if (state === "playing") {
      bannerTime = Math.max(0, bannerTime - dt);
      const result = stepMeteor(world, dt, {
        left: input.held("left"),
        right: input.held("right"),
        up: input.held("up"),
        down: input.held("down"),
        target,
      });
      if (result.includes("wave")) {
        banner = `Wave ${world.wave} · A fresh little challenge`;
        bannerTime = 2;
        ui.say(`Wave ${world.wave}. Shield replenished by one.`);
      }
      if (result.includes("boss")) {
        const guardian = METEOR_GUARDIANS[world.boss.variant];
        banner = `${guardian.name} incoming!`;
        bannerTime = 2;
        ui.say(`${guardian.name}. ${guardian.hint}`);
      }
      if (result.includes("damage")) {
        ctx.sound("lose");
        ui.say(`Hit! ${world.health} hull, ${world.shield} shields remaining.`);
      } else if (result.includes("pickup") || result.includes("boss-clear")) {
        ctx.sound("win");
        ui.say(
          result.includes("boss-clear")
            ? "Guardian cleared! One hull repaired."
            : "Upgrade collected.",
        );
      } else if (result.includes("hit")) ctx.sound();
      if (world.over) finish();
      update();
      draw();
    }
    raf = requestAnimationFrame(loop);
  }
  events.on(ui.el("#game-start"), "click", run);
  events.on(ui.el("#meteor-pause"), "click", pause);
  events.on(area, "pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button") || state !== "playing")
      return;
    e.preventDefault();
    area.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      shipX: world.ship.x,
      shipY: world.ship.y,
      scaleX: 400 / r.width,
      scaleY: 580 / r.height,
    };
    target = null;
    area.focus({ preventScroll: true });
  });
  events.on(area, "pointermove", (e) => {
    if (drag?.id !== e.pointerId) return;
    target = {
      x: Math.max(
        22,
        Math.min(378, drag.shipX + (e.clientX - drag.x) * drag.scaleX),
      ),
      y: Math.max(
        305,
        Math.min(540, drag.shipY + (e.clientY - drag.y) * drag.scaleY),
      ),
    };
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    events.on(area, name, (e) => {
      if (drag?.id === e.pointerId) {
        drag = null;
        target = null;
      }
    });
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      state === "paused" ? run() : pause();
    } else if (e.code === "Space" && state !== "playing") {
      e.preventDefault();
      run();
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
      record("meteor", world.score);
      destroyed = true;
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
