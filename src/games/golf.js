import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import {
  GOLF,
  GOLF_COURSES,
  golfBall,
  aimGolf,
  shootGolf,
  stepGolf,
  validGolfSave,
} from "../engines/golf.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let courseId = Object.hasOwn(GOLF_COURSES, get("golf-course"))
      ? get("golf-course")
      : "meadow",
    holes = GOLF_COURSES[courseId].holes,
    index = 0,
    scores = [],
    strokes = 0,
    ball = golfBall(holes[0]),
    aim = aimGolf(ball, holes[0].cup),
    state = "ready",
    drag = null,
    raf,
    last = 0,
    destroyed = false;
  const ui = frame(
    root,
    {
      stats: [
        ["Hole", "1 / 6", "hole"],
        ["Shots", 0, "shots"],
        ["Round total", 0, "total"],
      ],
      options: `<label>Course <select id="golf-course">${Object.entries(
        GOLF_COURSES,
      )
        .map(([id, c]) => `<option value="${id}">${c.name}</option>`)
        .join("")}</select></label>`,
      body: '<p class="course-name" id="course-name"></p><div class="canvas-wrap golf-wrap" id="game-board" tabindex="0" role="group" aria-label="Mini Golf course. Drag back from the ball to shoot, or use the aim and power controls below."><canvas width="960" height="720" aria-hidden="true"></canvas></div><div class="golf-scorecard" aria-label="Round scorecard"></div>',
      controls:
        '<div class="golf-sliders"><label>Aim <output id="aim-value">0°</output><input id="golf-angle" aria-label="Shot direction in degrees" type="range" min="0" max="359" step="1"></label><label>Power <output id="power-value">50%</output><input id="golf-power" aria-label="Shot power" type="range" min="5" max="100" step="1"></label></div><button class="button primary" id="game-start">Shoot</button><button class="button secondary" id="golf-pause" disabled>Pause</button><button class="text-button" id="reset-ball" disabled>Reset ball (+1 shot)</button>',
      note: "Drag back from the ball and release. Or tap to aim, set power, and Shoot. Arrows adjust aim/power; Space shoots.",
    },
    ctx,
  );
  const area = ui.el("#game-board"),
    canvas = ui.el("canvas"),
    g = canvas.getContext("2d"),
    angleInput = ui.el("#golf-angle"),
    powerInput = ui.el("#golf-power");
  g.scale(2, 2);
  const course = () => GOLF_COURSES[courseId];
  const total = () =>
    scores.reduce((a, b) => a + b, 0) +
    (state === "holed" || state === "complete" ? 0 : strokes);
  function scorecard() {
    ui.el(".golf-scorecard").innerHTML = holes
      .map(
        (h, i) =>
          `<div class="golf-hole-chip ${i === index ? "current" : ""} ${scores[i] ? "finished" : ""}" aria-label="Hole ${i + 1}, par ${h.par}${scores[i] ? `, ${scores[i]} shots` : ""}"><span>${i + 1}</span><strong>${scores[i] || "—"}</strong></div>`,
      )
      .join("");
  }
  function update() {
    ui.stat("hole", `${index + 1} / ${holes.length}`);
    ui.el("#golf-course").value = courseId;
    ui.stat("shots", strokes);
    ui.stat("total", total());
    ui.el("#course-name").textContent =
      `${holes[index].name} · Par ${holes[index].par}`;
    angleInput.value = Math.round(aim.angle) % 360;
    powerInput.value = Math.round(aim.power);
    ui.el("#aim-value").textContent = `${Math.round(aim.angle) % 360}°`;
    ui.el("#power-value").textContent = `${Math.round(aim.power)}%`;
    angleInput.disabled = powerInput.disabled = state !== "ready";
    ui.el("#game-start").disabled = state !== "ready";
    ui.el("#game-start").textContent =
      state === "rolling" ? "Ball rolling…" : "Shoot";
    ui.el("#golf-pause").disabled = state !== "rolling" && state !== "paused";
    ui.el("#golf-pause").textContent = state === "paused" ? "Resume" : "Pause";
    ui.el("#reset-ball").disabled = state !== "ready" || strokes === 0;
  }
  function persist() {
    if (state === "ready")
      set(course().saveKey, {
        courseId,
        index,
        scores,
        strokes,
        ball: { x: ball.x, y: ball.y },
      });
  }
  function draw() {
    g.fillStyle = courseId === "woodland" ? "#203d38" : "#173c33";
    g.fillRect(0, 0, 480, 360);
    g.fillStyle = courseId === "woodland" ? "#38634f" : "#275d45";
    g.beginPath();
    g.roundRect(20, 20, 440, 320, 14);
    g.fill();
    for (let y = 20; y < 340; y += 40)
      for (let x = 20; x < 460; x += 40)
        if ((x + y) % 80 === 40) {
          g.fillStyle = "#2c65491f";
          g.fillRect(x, y, 40, 40);
        }
    g.strokeStyle = "#8cb67c";
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(20, 20, 440, 320, 14);
    g.stroke();
    for (const w of holes[index].walls) {
      g.fillStyle = "#152f2c";
      g.beginPath();
      g.roundRect(w.x, w.y, w.w, w.h, 4);
      g.fill();
      g.strokeStyle = "#85a395";
      g.lineWidth = 2;
      g.stroke();
    }
    const cup = holes[index].cup;
    g.fillStyle = "#102b27";
    g.beginPath();
    g.arc(cup.x, cup.y, 12, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#9ac28a";
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = "#e3e1c1";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cup.x, cup.y);
    g.lineTo(cup.x, cup.y - 37);
    g.stroke();
    g.fillStyle = "#f3ac8d";
    g.beginPath();
    g.moveTo(cup.x, cup.y - 37);
    g.lineTo(cup.x + 22, cup.y - 29);
    g.lineTo(cup.x, cup.y - 22);
    g.fill();
    if (state === "ready") {
      const a = (aim.angle * Math.PI) / 180,
        length = 35 + aim.power * 0.9;
      g.fillStyle = "#d6efaa";
      for (let d = 18; d < length; d += 12) {
        g.beginPath();
        g.arc(
          ball.x + Math.cos(a) * d,
          ball.y + Math.sin(a) * d,
          1.8,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      g.strokeStyle = "#dcf1b055";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(ball.x, ball.y, 19, 0, Math.PI * 2);
      g.stroke();
    }
    if (!ball.holed) {
      g.fillStyle = "#10271f66";
      g.beginPath();
      g.ellipse(ball.x + 2, ball.y + 4, 8, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff5dc";
      g.beginPath();
      g.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#d1c8ae";
      g.beginPath();
      g.arc(ball.x + 2, ball.y + 1, 2, 0, Math.PI * 2);
      g.fill();
    }
  }
  function shoot() {
    if (state !== "ready" || document.querySelector("dialog[open]")) return;
    ball = shootGolf(ball, aim.angle, aim.power);
    strokes++;
    state = "rolling";
    drag = null;
    last = 0;
    update();
    ctx.sound();
    ui.say(`Shot ${strokes}. Let the ball find its way.`);
    area.focus({ preventScroll: true });
  }
  function nextHole() {
    area.querySelector(".board-overlay")?.remove();
    index++;
    strokes = 0;
    ball = golfBall(holes[index]);
    aim = aimGolf(ball, holes[index].cup);
    state = "ready";
    scorecard();
    update();
    draw();
    persist();
    ui.say(`Hole ${index + 1}. ${holes[index].name}. Par ${holes[index].par}.`);
  }
  function finishHole() {
    scores.push(strokes);
    ctx.sound("win");
    state = index === holes.length - 1 ? "complete" : "holed";
    scorecard();
    update();
    const sum = scores.reduce((a, b) => a + b, 0);
    if (state === "complete") {
      const fresh = record(course().recordKey, sum, true);
      set(course().saveKey, null);
      const best = get("best:" + course().recordKey);
      resultOverlay(
        area,
        fresh
          ? "A new personal best!"
          : `${course().name}. A lovely little round.`,
        `${course().name} · ${sum} shots · Course par ${holes.reduce((n, h) => n + h.par, 0)} · Best ${best}.`,
        restart,
        "Play a new round",
      );
      ui.say(
        `Round complete in ${sum} shots. ${fresh ? "New personal best!" : ""}`,
      );
    } else {
      set(course().saveKey, {
        courseId,
        index: index + 1,
        scores,
        strokes: 0,
        ball: holes[index + 1].start,
      });
      resultOverlay(
        area,
        strokes === 1 ? "A hole in one!" : "In the cup. Nicely done.",
        `Hole ${index + 1}: ${strokes} ${strokes === 1 ? "shot" : "shots"} · Par ${holes[index].par}`,
        nextHole,
        "Next hole",
      );
      ui.say(`Hole ${index + 1} complete in ${strokes} shots.`);
    }
  }
  function pause() {
    if (drag) {
      aim = drag.original;
      drag = null;
      update();
      draw();
    }
    if (state !== "rolling") return;
    state = "paused";
    drag = null;
    update();
    resultOverlay(
      area,
      "A little putting break.",
      "Your shot is paused right here.",
      resume,
      "Resume",
    );
    ui.say("Shot paused. Select Resume to continue.");
  }
  function resume() {
    if (state !== "paused") return;
    area.querySelector(".board-overlay")?.remove();
    state = "rolling";
    last = 0;
    update();
    area.focus({ preventScroll: true });
  }
  function restart() {
    index = 0;
    scores = [];
    strokes = 0;
    ball = golfBall(holes[0]);
    aim = aimGolf(ball, holes[0].cup);
    state = "ready";
    drag = null;
    last = 0;
    area.querySelector(".board-overlay")?.remove();
    scorecard();
    update();
    draw();
    persist();
    ui.say(
      "Six little holes. Drag back from the ball, or use the aim and power controls.",
    );
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.04) : 0;
    last = time;
    if (state === "rolling") {
      const count = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < count && !ball.holed; i++)
        ball = stepGolf(ball, holes[index], dt / count);
      draw();
      if (ball.holed) finishHole();
      else if (!ball.vx && !ball.vy) {
        state = "ready";
        aim = aimGolf(ball, holes[index].cup);
        update();
        persist();
        draw();
        ui.say("Ball at rest. Line up your next shot.");
      }
    }
    raf = requestAnimationFrame(loop);
  }
  function coordinates(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 480,
      y: ((e.clientY - r.top) / r.height) * 360,
    };
  }
  events.on(area, "pointerdown", (e) => {
    if (state !== "ready" || e.button !== 0 || e.target.closest("button"))
      return;
    e.preventDefault();
    area.focus({ preventScroll: true });
    const point = coordinates(e);
    if (Math.hypot(point.x - ball.x, point.y - ball.y) < 28) {
      drag = { x: e.clientX, y: e.clientY, original: { ...aim } };
      area.setPointerCapture(e.pointerId);
    } else {
      aim.angle =
        ((Math.atan2(point.y - ball.y, point.x - ball.x) * 180) / Math.PI +
          360) %
        360;
      update();
      draw();
    }
  });
  events.on(area, "pointermove", (e) => {
    if (!drag || state !== "ready") return;
    const p = coordinates(e),
      dx = ball.x - p.x,
      dy = ball.y - p.y;
    if (Math.hypot(dx, dy) < 3) return;
    aim = {
      angle: ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
      power: Math.max(5, Math.min(100, Math.hypot(dx, dy) / 1.6)),
    };
    update();
    draw();
  });
  events.on(area, "pointerup", (e) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y),
      original = drag.original;
    drag = null;
    if (moved >= 8) shoot();
    else {
      aim = original;
      update();
      draw();
    }
  });
  events.on(area, "pointercancel", () => {
    if (drag) aim = drag.original;
    drag = null;
    update();
    draw();
  });
  events.on(angleInput, "input", () => {
    aim.angle = Number(angleInput.value);
    update();
    draw();
  });
  events.on(powerInput, "input", () => {
    aim.power = Number(powerInput.value);
    update();
    draw();
  });
  events.on(ui.el("#game-start"), "click", shoot);
  events.on(ui.el("#golf-pause"), "click", () =>
    state === "paused" ? resume() : pause(),
  );
  events.on(ui.el("#reset-ball"), "click", () => {
    if (state !== "ready") return;
    ball = golfBall(holes[index]);
    strokes++;
    aim = aimGolf(ball, holes[index].cup);
    update();
    draw();
    persist();
    ui.say("Ball reset to the tee. One penalty shot added.");
  });
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (e.code === "Space") {
      e.preventDefault();
      shoot();
    } else if (
      state === "ready" &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "ArrowLeft") aim.angle = (aim.angle + 357) % 360;
      if (e.key === "ArrowRight") aim.angle = (aim.angle + 3) % 360;
      if (e.key === "ArrowUp") aim.power = Math.min(100, aim.power + 5);
      if (e.key === "ArrowDown") aim.power = Math.max(5, aim.power - 5);
      update();
      draw();
    }
  });
  events.on(window, "blur", () => {
    drag = null;
    pause();
  });
  function loadCourse() {
    const saved = get(course().saveKey);
    if (validGolfSave(saved) && (saved.courseId ?? "meadow") === courseId) {
      ({ index, scores, strokes } = saved);
      ball = { ...golfBall(holes[index]), ...saved.ball };
      aim = aimGolf(ball, holes[index].cup);
      state = "ready";
      drag = null;
      area.querySelector(".board-overlay")?.remove();
      scorecard();
      update();
      draw();
      ui.say(`Your saved ${course().name} round is ready.`);
    } else restart();
  }
  events.on(ui.el("#golf-course"), "change", (e) => {
    if (state === "rolling" || state === "paused") {
      e.target.value = courseId;
      ctx.toast("Let the ball stop before changing the course.");
      return;
    }
    persist();
    courseId = e.target.value;
    holes = course().holes;
    set("golf-course", courseId);
    loadCourse();
  });
  loadCourse();
  raf = requestAnimationFrame(loop);
  return {
    restart,
    pause,
    isPlaying: () => state !== "complete" && (strokes > 0 || index > 0),
    destroy: () => {
      destroyed = true;
      persist();
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
