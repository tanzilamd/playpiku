import { frame, listen, keyboardAllowed, resultOverlay } from "./shared.js";
import {
  RALLY_TRACKS,
  newRally,
  stepRally,
  resetRally,
} from "../engines/rally.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let trackId = Object.hasOwn(RALLY_TRACKS, get("rally-track"))
      ? get("rally-track")
      : "meadow",
    mode = ["practice", "relaxed", "classic"].includes(get("rally-mode"))
      ? get("rally-mode")
      : "practice",
    world = newRally(trackId, mode),
    state = "ready",
    raf,
    last = 0,
    lastHud = 0,
    destroyed = false,
    keys = new Set(),
    pointers = new Map(),
    wasOffroad = false;
  const ui = frame(
    root,
    {
      stats: [
        ["Lap", "Practice", "lap"],
        ["Time", "Free drive", "time"],
        ["Best", "—", "best"],
      ],
      options: `<label>Track <select id="rally-track">${Object.entries(
        RALLY_TRACKS,
      )
        .map(([id, t]) => `<option value="${id}">${t.name}</option>`)
        .join(
          "",
        )}</select></label><label>Drive <select id="rally-mode"><option value="practice">Practice · No pressure</option><option value="relaxed">3 laps · Relaxed</option><option value="classic">3 laps · Classic</option></select></label>`,
      body: '<div class="canvas-wrap rally-wrap" id="game-board" tabindex="0" role="group" aria-label="Piku Rally race track. The car accelerates automatically. Use left and right arrows to steer and Down to brake."><canvas width="1280" height="960" aria-hidden="true"></canvas></div><p class="rally-road-status" id="road-status">Follow the road. The mint ring marks your next checkpoint.</p>',
      controls:
        '<button class="button primary" id="game-start">Start driving</button><button class="button secondary" id="back-to-road">Back to track</button><div class="rally-pad" aria-label="Driving controls"><button data-drive="left" aria-label="Steer left">←<small>STEER</small></button><button data-drive="brake" aria-label="Brake">↓<small>BRAKE</small></button><button data-drive="right" aria-label="Steer right">→<small>STEER</small></button></div>',
      note: "Auto-accelerate · ← / A and → / D steer · ↓ / S brakes · Space / P pauses · Hold touch buttons to drive",
    },
    ctx,
  );
  ui.el(".game-options").classList.add("rally-options");
  const area = ui.el("#game-board"),
    g = ui.el("canvas").getContext("2d");
  g.scale(2, 2);
  ui.el("#rally-track").value = trackId;
  ui.el("#rally-mode").value = mode;
  const key = () => `rally-${trackId}-${mode}`,
    format = (ms) => {
      const c = Math.floor(ms / 10);
      return `${Math.floor(c / 6000)}:${String(Math.floor(c / 100) % 60).padStart(2, "0")}.${String(c % 100).padStart(2, "0")}`;
    };
  function update() {
    ui.stat(
      "lap",
      mode === "practice"
        ? `${world.laps + 1} · Practice`
        : `${Math.min(3, world.laps + 1)} / 3`,
    );
    ui.stat(
      "time",
      mode === "practice"
        ? "Free drive"
        : format((world.time + world.penalty) * 1000),
    );
    const best = get("best:" + key());
    ui.stat("best", mode === "practice" || best === null ? "—" : format(best));
    ui.el("#game-start").textContent =
      state === "ready"
        ? "Start driving"
        : state === "playing"
          ? "Pause"
          : state === "paused"
            ? "Resume"
            : "Race again";
    ui.el("#back-to-road").disabled = state !== "playing";
    ui.el("#back-to-road").textContent =
      mode === "practice" ? "Back to track" : "Back to track (+3s)";
  }
  function draw() {
    const track = RALLY_TRACKS[trackId],
      points = track.points;
    g.fillStyle = track.color;
    g.fillRect(0, 0, 640, 480);
    g.fillStyle = "#d6e5ac14";
    for (let i = 0; i < 35; i++) {
      g.beginPath();
      g.arc(
        25 + ((i * 97) % 595),
        25 + ((i * 53) % 430),
        3 + (i % 3),
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    function line(width, color, dash = []) {
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (const p of points.slice(1)) g.lineTo(p.x, p.y);
      g.closePath();
      g.lineWidth = width;
      g.strokeStyle = color;
      g.lineJoin = "round";
      g.lineCap = "round";
      g.setLineDash(dash);
      g.stroke();
      g.setLineDash([]);
    }
    line(track.width + 9, "#cfbfa0");
    line(track.width + 4, "#e3e0cc", [11, 11]);
    line(track.width, "#465159");
    line(2, "#d9d8b28c", [12, 14]);
    const a = points[0],
      next = points[1],
      angle = Math.atan2(next.y - a.y, next.x - a.x);
    g.save();
    g.translate(a.x, a.y);
    g.rotate(angle);
    for (let y = -track.width / 2; y < track.width / 2; y += 8)
      for (let x = -8; x < 8; x += 8) {
        g.fillStyle = (Math.round(y / 8) + x / 8) % 2 ? "#efeedb" : "#273239";
        g.fillRect(x, y, 8, 8);
      }
    g.restore();
    const goal = points[world.nextCheckpoint];
    g.strokeStyle = "#c7f36b";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(goal.x, goal.y, 15, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#e8f7c7";
    g.font = "bold 13px Arial";
    g.textAlign = "center";
    g.fillText("NEXT", goal.x, goal.y - 23);
    g.save();
    g.translate(world.x, world.y);
    g.rotate(world.angle);
    g.fillStyle = "#142a2c66";
    g.beginPath();
    g.ellipse(2, 3, 19, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#182328";
    for (const [x, y] of [
      [-9, -11],
      [8, -11],
      [-9, 7],
      [8, 7],
    ])
      g.fillRect(x, y, 8, 5);
    g.fillStyle = "#e6c175";
    g.beginPath();
    g.roundRect(-17, -9, 34, 18, 5);
    g.fill();
    g.fillStyle = "#28484f";
    g.beginPath();
    g.roundRect(-5, -7, 13, 14, 3);
    g.fill();
    g.fillStyle = "#fff2b9";
    g.fillRect(12, -7, 3, 4);
    g.fillRect(12, 3, 3, 4);
    g.restore();
    g.fillStyle = "#10211bba";
    g.beginPath();
    g.roundRect(16, 16, 115, 37, 8);
    g.fill();
    g.fillStyle = "#e9f2cb";
    g.font = "bold 17px Arial";
    g.textAlign = "left";
    g.fillText(`${Math.round(world.speed * 0.6)} km/h`, 28, 41);
  }
  function clearInput() {
    keys.clear();
    pointers.clear();
    root
      .querySelectorAll("[data-drive]")
      .forEach((b) => b.classList.remove("pressed"));
  }
  function run() {
    if (state === "done") restart();
    state = "playing";
    last = 0;
    area.querySelector(".board-overlay")?.remove();
    update();
    area.focus({ preventScroll: true });
    ui.say(
      "Your car accelerates automatically. Steer toward the next mint checkpoint; brake for tighter bends.",
    );
  }
  function restart() {
    world = newRally(trackId, mode);
    state = "ready";
    clearInput();
    last = 0;
    wasOffroad = false;
    area.querySelector(".board-overlay")?.remove();
    update();
    draw();
    resultOverlay(
      area,
      mode === "practice"
        ? "Find your racing rhythm."
        : "Three laps. Your best line.",
      mode === "practice"
        ? "No clock. No pressure. Learn the road, then try a race."
        : "Pass every checkpoint in order. Grass slows you down.",
      run,
      "Start driving",
    );
    ui.say(
      "Choose your track and drive mode. Practice is a good place to start.",
    );
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    clearInput();
    update();
    resultOverlay(
      area,
      "Park your worries.",
      "The car and race clock are paused.",
      run,
      "Resume",
    );
    ui.say("Driving paused. Select Resume to continue.");
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.04) : 0;
    last = time;
    if (state === "playing") {
      const controls = new Set([...pointers.values()]),
        steer =
          Number(
            keys.has("ArrowRight") || keys.has("d") || controls.has("right"),
          ) -
          Number(
            keys.has("ArrowLeft") || keys.has("a") || controls.has("left"),
          ),
        brake = keys.has("ArrowDown") || keys.has("s") || controls.has("brake"),
        count = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < count && !world.finished; i++)
        world = stepRally(world, { steer, brake }, dt / count);
      draw();
      if (time - lastHud > 100) {
        update();
        lastHud = time;
      }
      if (world.offroad !== wasOffroad) {
        wasOffroad = world.offroad;
        ui.el("#road-status").textContent = world.offroad
          ? "On the grass — slow down and steer back. Back to track can help."
          : "Back on the road. Follow the mint checkpoint.";
      }
      if (world.finished) {
        state = "done";
        clearInput();
        const ms = Math.round((world.time + world.penalty) * 1000),
          fresh = record(key(), ms, true);
        update();
        ctx.sound("win");
        resultOverlay(
          area,
          fresh ? "A new personal best!" : "Three lovely little laps.",
          `${format(ms)} total${world.penalty ? ` · ${world.penalty}s reset penalties` : ""}. Ready for another run?`,
          () => {
            restart();
            run();
          },
          "Race again",
        );
        ui.say(
          `Race complete. ${format(ms)}${fresh ? ". New personal best!" : ""}`,
        );
      }
    }
    raf = requestAnimationFrame(loop);
  }
  events.on(ui.el("#game-start"), "click", () =>
    state === "playing" ? pause() : run(),
  );
  events.on(ui.el("#back-to-road"), "click", () => {
    if (state !== "playing") return;
    world = resetRally(world);
    clearInput();
    update();
    draw();
    ui.say(
      mode === "practice"
        ? "Back on the road."
        : "Back on the road. Three seconds added to your race time.",
    );
  });
  for (const b of root.querySelectorAll("[data-drive]")) {
    events.on(b, "pointerdown", (e) => {
      if (state !== "playing" || e.button !== 0) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, b.dataset.drive);
      b.classList.add("pressed");
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      events.on(b, name, (e) => {
        pointers.delete(e.pointerId);
        if (![...pointers.values()].includes(b.dataset.drive))
          b.classList.remove("pressed");
      });
    events.on(b, "keydown", (e) => {
      if ([" ", "Enter"].includes(e.key) && state === "playing") {
        e.preventDefault();
        pointers.set("keyboard-" + b.dataset.drive, b.dataset.drive);
      }
    });
    events.on(b, "keyup", () => pointers.delete("keyboard-" + b.dataset.drive));
  }
  events.on(document, "keydown", (e) => {
    if (!keyboardAllowed(e) || e.repeat) return;
    if (
      ["ArrowLeft", "ArrowRight", "ArrowDown", "a", "d", "s"].includes(e.key)
    ) {
      e.preventDefault();
      if (state === "playing") keys.add(e.key);
    } else if (e.code === "Space" || e.key.toLowerCase() === "p") {
      e.preventDefault();
      state === "playing" ? pause() : state === "paused" ? run() : null;
    }
  });
  events.on(document, "keyup", (e) => {
    keys.delete(e.key);
    if (e.code === "Space" || e.key === "Enter")
      for (const id of [...pointers.keys()])
        if (typeof id === "string") pointers.delete(id);
  });
  events.on(window, "blur", () => {
    clearInput();
    pause();
  });
  for (const id of ["rally-track", "rally-mode"])
    events.on(ui.el("#" + id), "change", (e) => {
      if (state === "playing" || state === "paused") {
        e.target.value = id === "rally-track" ? trackId : mode;
        ctx.toast("Restart first to change track or mode.");
        return;
      }
      if (id === "rally-track") {
        trackId = e.target.value;
        set(id, trackId);
      } else {
        mode = e.target.value;
        set(id, mode);
      }
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
      clearInput();
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
