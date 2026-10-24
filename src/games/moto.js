import { frame, listen, keyboardAllowed } from "./shared.js";
import {
  MOTO_TRACKS,
  newMoto,
  stepMoto,
  resetMoto,
  motoGround,
  motoMedal,
  validMotoGhost,
  motoGhostAt,
} from "../engines/moto.js";
import { drivingInput, raceResult } from "./driving.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let trackId = MOTO_TRACKS.some((t) => t.id === get("moto-track"))
      ? get("moto-track")
      : "trail-1",
    world = newMoto(trackId),
    state = "ready",
    raf,
    last = 0,
    hudAt = 0,
    destroyed = false,
    ghost = null,
    frames = [],
    showGhost = get("moto-show-ghost", true) !== false;
  const ui = frame(
    root,
    {
      stats: [
        ["Time", "0.0 s", "time"],
        ["Best", "—", "best"],
        ["Landings", 0, "landings"],
      ],
      options: `<label>Trail <select id="moto-track">${MOTO_TRACKS.map((t) => `<option value="${t.id}">${t.region} · ${t.name}</option>`).join("")}</select></label><button class="button secondary small" id="moto-ghost" aria-pressed="true">Ghost: on</button>`,
      body: '<div class="moto-progress"><progress id="moto-progress" max="100" value="0" aria-label="Trail progress"></progress><span id="moto-checkpoint">Start meadow</span></div><div class="canvas-wrap moto-wrap" id="game-board" tabindex="0" role="group" aria-label="Bike trail. Hold Up to accelerate, Down to brake, Left to lean back, Right to lean forward."><canvas width="1280" height="840" aria-hidden="true"></canvas></div><p class="drive-status" id="moto-status">Hold Accelerate and enjoy your first trail. Gentle balance assistance helps you land.</p>',
      controls:
        '<div class="drive-actions"><button class="button primary" id="game-start">Start riding</button><button class="button secondary" id="moto-checkpoint-reset">Checkpoint (+3s)</button></div><div class="moto-pad" aria-label="Bike riding controls"><button data-drive="back" aria-label="Lean back">←<small>LEAN BACK</small></button><button data-drive="brake" aria-label="Brake">↓<small>BRAKE</small></button><button data-drive="gas" aria-label="Accelerate">↑<small>ACCELERATE</small></button><button data-drive="forward" aria-label="Lean forward">→<small>LEAN FORWARD</small></button></div>',
      note: "Hold ↑ / W to accelerate · ↓ / S brakes · ← → / A D lean · P / Space pauses · Checkpoint adds 3 seconds",
    },
    ctx,
  );
  ui.el(".game-options").classList.add("journey-options");
  const area = ui.el("#game-board"),
    g = ui.el("canvas").getContext("2d");
  g.scale(2, 2);
  ui.el(".game-stage").classList.add("moto-stage");
  const input = drivingInput(root, events, {
    arrowup: "gas",
    w: "gas",
    arrowdown: "brake",
    s: "brake",
    arrowleft: "back",
    a: "back",
    arrowright: "forward",
    d: "forward",
  });
  const track = () => MOTO_TRACKS.find((t) => t.id === trackId),
    elapsed = () => world.time + world.penalty;
  function sample(force = false) {
    const t = elapsed(),
      previous = frames.at(-1)?.[0] ?? -1;
    if (frames.length < 5000 && t > previous && (force || t - previous >= 0.12))
      frames.push([t, world.x, world.y, world.angle]);
  }
  function update() {
    ui.stat("time", `${elapsed().toFixed(1)} s`);
    ui.stat("landings", world.landings);
    const best = get(`best:moto-${trackId}`);
    ui.stat(
      "best",
      typeof best === "number" ? `${(best / 1000).toFixed(1)} s` : "—",
    );
    if (best === null) ghost = null;
    ui.el("#moto-progress").value = Math.min(
      100,
      (world.x / track().length) * 100,
    );
    ui.el("#moto-checkpoint").textContent =
      `${Math.min(100, Math.floor((world.x / track().length) * 100))}% · ${world.checkpoint > 40 ? "Checkpoint " + Math.floor(world.checkpoint / 400) : "Start meadow"}${world.penalty ? " · +" + world.penalty + "s" : ""}`;
    ui.el("#moto-track").value = trackId;
    ui.el("#moto-track").disabled = state !== "ready";
    ui.el("#moto-ghost").textContent = `Ghost: ${showGhost ? "on" : "off"}`;
    ui.el("#moto-ghost").setAttribute("aria-pressed", String(showGhost));
    ui.el("#game-start").textContent =
      state === "ready"
        ? "Start riding"
        : state === "playing"
          ? "Pause"
          : state === "paused"
            ? "Resume"
            : state === "crashed"
              ? "Back to checkpoint (+3s)"
              : "Ride again";
    ui.el("#moto-checkpoint-reset").disabled = ![
      "playing",
      "paused",
      "crashed",
    ].includes(state);
    ui.el("#moto-status").textContent =
      state === "paused"
        ? "Paused. Your trail and timer are safe."
        : state === "crashed"
          ? "A soft landing next time. Return to your checkpoint with a 3-second penalty."
          : state === "over"
            ? "Trail complete. Try another trail or race your best-time ghost."
            : ghost
              ? "The translucent bike is your best run. Smooth landings make up time."
              : "Hold Accelerate · Lean gently in the air · Checkpoints save your place";
  }
  function bike(rider, camera, alpha = 1) {
    const x = (rider.x - camera) * 1.2,
      y = 295 - (rider.y - 100) * 1.2;
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    g.rotate(-rider.angle);
    g.scale(1.2, 1.2);
    for (const wx of [-20, 20]) {
      g.fillStyle = "#263941";
      g.beginPath();
      g.arc(wx, 12, 11, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#d8dfc8";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(wx, 12, 7, 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = "#c7ee8c";
    g.lineWidth = 5;
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(-20, 12);
    g.lineTo(-8, -5);
    g.lineTo(9, 12);
    g.lineTo(-20, 12);
    g.moveTo(-8, -5);
    g.lineTo(15, -5);
    g.lineTo(20, 12);
    g.stroke();
    g.strokeStyle = "#364e50";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(15, -5);
    g.lineTo(13, -15);
    g.lineTo(5, -17);
    g.moveTo(-13, -8);
    g.lineTo(-3, -8);
    g.stroke();
    g.strokeStyle = "#395d70";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(-5, -12);
    g.lineTo(0, -24);
    g.lineTo(10, -16);
    g.moveTo(-5, -12);
    g.lineTo(3, 2);
    g.lineTo(-2, 8);
    g.stroke();
    g.fillStyle = "#f4c39f";
    g.beginPath();
    g.arc(1, -34, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f0b073";
    g.beginPath();
    g.arc(1, -36, 9, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(-8, -36, 21, 4);
    g.restore();
  }
  function draw() {
    const t = track(),
      camera = Math.max(0, Math.min(t.length - 430, world.x - 145));
    g.fillStyle = t.sky;
    g.fillRect(0, 0, 640, 420);
    g.fillStyle = "#fff0c6a8";
    g.beginPath();
    g.arc(535, 61, 29, 0, Math.PI * 2);
    g.fill();
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer ? "#688b8877" : "#d7e3d477";
      g.beginPath();
      g.moveTo(0, 280);
      for (let x = 0; x <= 650; x += 10)
        g.lineTo(
          x,
          188 +
            layer * 34 +
            Math.sin((x + camera * (0.1 + layer * 0.08)) / (65 + layer * 25)) *
              (35 - layer * 9),
        );
      g.lineTo(650, 420);
      g.lineTo(0, 420);
      g.fill();
    }
    g.beginPath();
    g.moveTo(0, 420);
    for (let sx = 0; sx <= 645; sx += 4)
      g.lineTo(sx, 295 - (motoGround(t, camera + sx / 1.2) - 100) * 1.2);
    g.lineTo(645, 420);
    g.closePath();
    g.fillStyle = t.soil;
    g.fill();
    g.beginPath();
    for (let sx = 0; sx <= 645; sx += 4) {
      const sy = 295 - (motoGround(t, camera + sx / 1.2) - 100) * 1.2;
      if (sx === 0) g.moveTo(sx, sy);
      else g.lineTo(sx, sy);
    }
    g.strokeStyle = "#dce2ad";
    g.lineWidth = 6;
    g.stroke();
    for (let x = Math.floor(camera / 95) * 95; x < camera + 550; x += 95) {
      const sx = (x - camera) * 1.2,
        sy = 295 - (motoGround(t, x) - 100) * 1.2;
      g.fillStyle = "#e4deb144";
      g.beginPath();
      g.ellipse(sx, sy + 27 + (x % 17), 7, 3, -0.3, 0, Math.PI * 2);
      g.fill();
    }
    for (const x of [
      ...Array.from(
        { length: Math.floor(t.length / 400) },
        (_, i) => (i + 1) * 400,
      ),
      t.length,
    ]) {
      const sx = (x - camera) * 1.2;
      if (sx < -20 || sx > 680) continue;
      const sy = 295 - (motoGround(t, x) - 100) * 1.2;
      g.strokeStyle = "#344a46";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(sx, sy - 66);
      g.stroke();
      g.fillStyle =
        x === t.length
          ? "#f2e5bb"
          : world.checkpoint >= x
            ? "#d5ed99"
            : "#e3a984";
      g.fillRect(sx, sy - 66, 32, 23);
      if (x === t.length) {
        g.fillStyle = "#3f5150";
        for (let a = 0; a < 4; a++)
          for (let b = 0; b < 3; b++)
            if ((a + b) % 2) g.fillRect(sx + a * 8, sy - 66 + b * 7.6, 8, 7.6);
      }
      g.fillStyle = "#253d39";
      g.font = "bold 11px Arial";
      g.textAlign = "center";
      g.fillText(x === t.length ? "FINISH" : "CHECKPOINT", sx + 10, sy - 75);
    }
    if (showGhost && ghost) {
      const rider = motoGhostAt(ghost, elapsed());
      if (rider) bike(rider, camera, 0.32);
    }
    bike(world, camera);
    if (["ready", "paused"].includes(state)) {
      g.fillStyle = "#1423329c";
      g.fillRect(0, 0, 640, 420);
      g.fillStyle = "#f1edd8";
      g.font = "bold 26px Arial";
      g.textAlign = "center";
      g.fillText(state === "ready" ? t.name : "A little breather.", 320, 171);
      g.font = "15px Arial";
      g.fillText(
        state === "ready"
          ? "Start riding, then hold Accelerate."
          : "Select Resume when you are ready.",
        320,
        200,
      );
    }
  }
  function restart() {
    world = newMoto(trackId);
    state = "ready";
    input.clear();
    last = 0;
    frames = [[0, world.x, world.y, world.angle]];
    ghost = validMotoGhost(get(`moto-ghost:${trackId}`), trackId);
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    ui.el("#game-start").focus({ preventScroll: true });
  }
  function checkpoint() {
    if (world.status === "won") return;
    world = resetMoto(world);
    state = "playing";
    input.clear();
    last = 0;
    sample(true);
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    ui.say(
      "Back at your checkpoint. Three seconds added. Hold Accelerate to continue.",
    );
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    input.clear();
    update();
    draw();
  }
  function finish() {
    input.clear();
    if (world.status === "crashed") {
      state = "crashed";
      raceResult(
        area,
        "A little tumble.",
        "Your checkpoint is safe. A gentle lean helps the wheels meet the slope.",
        [
          ["Back to checkpoint (+3s)", checkpoint],
          ["Retry track", restart],
        ],
      );
      ctx.sound("lose");
    } else {
      state = "over";
      sample(true);
      const fresh = record(
        `moto-${trackId}`,
        Math.round(elapsed() * 1000),
        true,
      );
      if (fresh && frames.length > 1) {
        const value = { version: 1, track: trackId, frames };
        if (validMotoGhost(value, trackId)) {
          set(`moto-ghost:${trackId}`, value);
          ghost = value;
        }
      }
      const index = MOTO_TRACKS.findIndex((t) => t.id === trackId);
      raceResult(
        area,
        `${motoMedal(world)} medal. Lovely ride.`,
        `${elapsed().toFixed(1)} seconds · ${world.landings} smooth landings${world.penalty ? " · " + world.penalty + "s checkpoint penalties included" : ""}. ${fresh ? "A new personal best! Your ghost is saved." : "Your best-time ghost is ready for another race."}`,
        [
          ["Ride again", restart],
          [
            "Next trail",
            () => {
              trackId = MOTO_TRACKS[(index + 1) % 12].id;
              set("moto-track", trackId);
              restart();
            },
          ],
        ],
      );
      ctx.sound("win");
    }
    update();
    ui.say(
      world.status === "won"
        ? "Trail complete. " + motoMedal(world) + " medal."
        : "Bike fell. Select Back to checkpoint to continue.",
    );
  }
  function toggle() {
    if (state === "playing") pause();
    else if (state === "crashed") checkpoint();
    else if (state === "over") restart();
    else {
      state = "playing";
      last = 0;
      update();
    }
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;
    if (state === "playing") {
      const count = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < count && world.status === "playing"; i++) {
        world = stepMoto(world, dt / count, {
          gas: input.held("gas"),
          brake: input.held("brake"),
          lean: Number(input.held("back")) - Number(input.held("forward")),
        });
        sample();
      }
      if (world.status !== "playing") finish();
    }
    if (time - hudAt > 100) {
      update();
      hudAt = time;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }
  events.on(ui.el("#game-start"), "click", toggle);
  events.on(ui.el("#moto-checkpoint-reset"), "click", checkpoint);
  events.on(ui.el("#moto-track"), "change", (e) => {
    trackId = e.target.value;
    set("moto-track", trackId);
    restart();
  });
  events.on(ui.el("#moto-ghost"), "click", () => {
    showGhost = !showGhost;
    set("moto-show-ghost", showGhost);
    update();
    draw();
  });
  events.on(document, "keydown", (e) => {
    if (
      keyboardAllowed(e) &&
      !e.repeat &&
      (e.key.toLowerCase() === "p" || e.code === "Space")
    ) {
      e.preventDefault();
      toggle();
    }
  });
  events.on(window, "blur", pause);
  restart();
  raf = requestAnimationFrame(loop);
  return {
    restart,
    pause,
    isPlaying: () =>
      ["playing", "paused", "crashed"].includes(state) && world.time > 0,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      input.clear();
      events.destroy();
    },
  };
}
