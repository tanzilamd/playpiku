import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import { drivingInput, raceResult } from "./driving.js";
import {
  newPinball,
  launchPinball,
  nudgePinball,
  stepPinball,
  flipperSegment,
  PINBALL_BUMPERS,
  PINBALL_TARGETS,
} from "../engines/pinball.js";
import { get, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let world = newPinball(),
    state = "ready",
    last = 0,
    raf,
    destroyed = false,
    display = "";
  const ui = frame(
    root,
    {
      stats: [
        ["Score", 0, "score"],
        ["Best", get("best:pinball", 0), "best"],
        ["Balls", 3, "balls"],
        ["Multiplier", "×1", "multiplier"],
      ],
      body: '<div class="canvas-wrap arcade-tall pinball-wrap" id="game-board" tabindex="0" role="group" aria-label="Pinball table. Hold left and right arrows for the flippers. Space launches a ball. N nudges the table."><canvas width="800" height="1200" aria-hidden="true"></canvas></div>',
      controls:
        '<div class="pinball-flippers"><button class="button secondary drive-button" data-drive="left" aria-label="Hold left flipper">← Left flipper</button><button class="button secondary drive-button" data-drive="right" aria-label="Hold right flipper">Right flipper →</button></div><button class="button primary" id="game-start">Launch ball</button><button class="button secondary" id="pinball-nudge">Nudge · 3</button><button class="button secondary" id="pinball-pause" disabled>Pause</button>',
      note: "Hold ← / A and → / D for flippers · Space to launch · N to nudge · P to pause · Three balls per game",
    },
    ctx,
  );
  const area = ui.el("#game-board"),
    canvas = ui.el("canvas"),
    g = canvas.getContext("2d");
  g.scale(2, 2);
  const input = drivingInput(root, events, {
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
  });
  function update() {
    const stamp = [
      world.score,
      world.balls,
      world.multiplier,
      world.nudges,
      state,
      world.launched,
      world.nudgeCooldown > 0,
    ].join();
    if (stamp === display) return;
    display = stamp;
    ui.stat("score", world.score);
    ui.stat("balls", world.balls);
    ui.stat("multiplier", "×" + world.multiplier);
    ui.stat("best", Math.max(get("best:pinball", 0), world.score));
    ui.el("#game-start").textContent =
      state === "paused"
        ? "Resume"
        : state === "done"
          ? "Play again"
          : world.launched
            ? "Ball in play"
            : "Launch ball";
    ui.el("#game-start").disabled = state === "playing" && world.launched;
    ui.el("#pinball-pause").disabled = state !== "playing";
    ui.el("#pinball-nudge").textContent = `Nudge · ${world.nudges}`;
    ui.el("#pinball-nudge").disabled =
      state !== "playing" ||
      !world.launched ||
      world.nudges === 0 ||
      world.nudgeCooldown > 0;
    area.dataset.state = state;
    area.dataset.ball = world.ballId;
  }
  function line(ax, ay, bx, by, color, width) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
  }
  function circle(x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  function draw() {
    g.fillStyle = "#20233c";
    g.fillRect(0, 0, 400, 600);
    g.strokeStyle = "#4c4870";
    g.lineWidth = 9;
    g.beginPath();
    g.roundRect(19, 24, 362, 553, 48);
    g.stroke();
    g.strokeStyle = "#383958";
    g.lineWidth = 1;
    for (let y = 110; y < 480; y += 37) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(377, y);
      g.stroke();
    }
    line(346, 126, 346, 543, "#777093", 5);
    line(351, 544, 374, 544, "#e8bb8f", 5);
    g.fillStyle = "#ded4eb";
    g.textAlign = "center";
    g.font = "bold 14px Arial";
    g.fillText("PIKU • STAR GARDEN", 200, 128);
    for (let i = 0; i < 3; i++) {
      const p = PINBALL_TARGETS[i];
      circle(p.x, p.y, 18, world.targets[i] ? "#d4ee9a" : "#54516f");
      g.fillStyle = world.targets[i] ? "#26363c" : "#d5c9e8";
      g.font = "bold 18px Arial";
      g.fillText(["P", "I", "K"][i], p.x, p.y + 6);
    }
    for (let i = 0; i < PINBALL_BUMPERS.length; i++) {
      const p = PINBALL_BUMPERS[i],
        flash = world.flash[i] > 0;
      circle(p.x, p.y, p.r + 7, flash ? "#d5edb980" : "#70607855");
      circle(
        p.x,
        p.y,
        p.r,
        flash ? "#f5e4aa" : ["#d4afe4", "#a8cbd7", "#e9b4a4"][i],
      );
      circle(p.x - 4, p.y - 5, p.r * 0.55, "#ffffff33");
      g.fillStyle = "#3f4054";
      g.font = "bold 19px Arial";
      g.fillText("✦", p.x, p.y + 7);
    }
    line(30, 350, 95, 438, "#e2ac9b", 10);
    line(327, 350, 305, 438, "#e2ac9b", 10);
    line(38, 419, 108, 490, "#8c9ec0", 10);
    line(338, 419, 292, 490, "#8c9ec0", 10);
    circle(132, 350, 5, "#dceaa2");
    circle(200, 380, 5, "#dfb1dd");
    circle(268, 350, 5, "#a5dbe2");
    g.fillStyle = "#c4c6db";
    g.font = "12px Arial";
    g.fillText(
      world.targetFlash > 0
        ? "MULTIPLIER UP!"
        : "Light P · I · K to boost your multiplier",
      190,
      322,
    );
    for (let i = 0; i < 2; i++) {
      const f = flipperSegment(i, world.flippers[i]);
      line(f.ax, f.ay, f.bx, f.by, "#1b2031", 23);
      line(
        f.ax,
        f.ay,
        f.bx,
        f.by,
        world.flippers[i] > 0.5 ? "#deedac" : "#b9acd8",
        16,
      );
      circle(f.ax, f.ay, 5, "#e9e2f1");
    }
    const b = world.ball;
    circle(b.x + 2, b.y + 3, 9, "#00000044");
    circle(b.x, b.y, 8, "#eff1ec");
    circle(b.x - 2, b.y - 3, 3, "#ffffff");
    g.font = "bold 12px Arial";
    g.fillStyle = world.save > 0 ? "#d2e9a3" : "#b3aac5";
    g.fillText(
      world.save > 0
        ? `BALL SAVE · ${Math.ceil(world.save)}s`
        : world.launched
          ? "KEEP THE LITTLE LIGHT ALIVE"
          : "SPACE OR LAUNCH TO PLAY",
      200,
      570,
    );
  }
  function run() {
    if (state === "done") restart();
    state = "playing";
    last = 0;
    input.clear();
    area.querySelector(".board-overlay")?.remove();
    root.querySelector(".race-result")?.remove();
    if (!world.launched) launchPinball(world);
    update();
    draw();
    area.focus({ preventScroll: true });
    ui.say(
      "Ball launched. Hold the flippers to send it back up. Light all three top targets for a multiplier.",
    );
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    input.clear();
    record("pinball", world.score);
    update();
    resultOverlay(
      area,
      "Keep your sparkle.",
      "Your ball is paused. Resume whenever you’re ready.",
      run,
      "Resume",
    );
  }
  function restart() {
    world = newPinball();
    state = "ready";
    input.clear();
    last = 0;
    display = "";
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    resultOverlay(
      area,
      "A little silver-ball magic.",
      "Hold both flippers to keep the ball alive. Three balls, endless little possibilities.",
      run,
      "Launch ball",
    );
    ui.say("Ready. Launch your first ball.");
  }
  function nudge() {
    if (state !== "playing") return;
    if (nudgePinball(world)) {
      ctx.sound();
      ui.say(`${world.nudges} nudges left for this ball.`);
      update();
    }
  }
  function finish() {
    state = "done";
    input.clear();
    record("pinball", world.score);
    update();
    draw();
    ctx.sound("lose");
    raceResult(
      area,
      "A bright little run.",
      `${world.score} points · ${world.bumps} bumper hits · Best ${get("best:pinball", 0)}.`,
      [
        [
          "Play again",
          () => {
            restart();
            run();
          },
        ],
      ],
    );
    ui.say(
      `Game over. ${world.score} points. Play again for three fresh balls.`,
    );
  }
  function loop(t) {
    if (destroyed) return;
    const dt = last ? Math.min(0.04, (t - last) / 1000) : 0;
    last = t;
    if (state === "playing") {
      const result = stepPinball(world, dt, {
        left: input.held("left"),
        right: input.held("right"),
      });
      if (result.includes("over")) finish();
      else if (result.includes("drain")) {
        record("pinball", world.score);
        ui.say(
          `Ball lost. ${world.balls} balls left. Choose Launch ball when ready.`,
        );
        ctx.sound("lose");
      } else if (result.includes("save")) {
        ui.say("Ball saved! Back into the garden.");
        ctx.sound("win");
      } else if (result.includes("multiplier")) {
        ui.say(`Multiplier increased to ${world.multiplier}.`);
        ctx.sound("win");
      } else if (result.includes("bumper") || result.includes("target"))
        ctx.sound();
      update();
      draw();
    }
    raf = requestAnimationFrame(loop);
  }
  events.on(ui.el("#game-start"), "click", run);
  events.on(ui.el("#pinball-pause"), "click", pause);
  events.on(ui.el("#pinball-nudge"), "click", nudge);
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (state !== "playing" || !world.launched) run();
    } else if (e.key.toLowerCase() === "n") {
      e.preventDefault();
      nudge();
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      state === "paused" ? run() : pause();
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
      record("pinball", world.score);
      destroyed = true;
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
