import { frame, listen, keyboardAllowed, swipe } from "./shared.js";
import {
  newTraffic,
  stepTraffic,
  trafficLane,
  TRAFFIC_CARS,
  trafficGarage,
  buyTrafficCar,
} from "../engines/traffic.js";
import { drivingInput, raceResult } from "./driving.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let mode = get("traffic-mode") === "challenge" ? "challenge" : "endless",
    garage = trafficGarage(get("traffic-garage")),
    selectedCar = get("traffic-car", "mint"),
    world = newTraffic(mode),
    state = "ready",
    raf,
    last = 0,
    hudAt = 0,
    destroyed = false,
    rewarded = false;
  if (!garage.owned.includes(selectedCar)) selectedCar = "mint";
  const ui = frame(
    root,
    {
      stats: [
        ["Distance", "0 m", "distance"],
        ["Score", 0, "score"],
        ["Best", "—", "best"],
      ],
      options:
        '<label>Drive <select id="traffic-mode"><option value="endless">Endless · Chase a record</option><option value="challenge">Challenge · 1,500 m</option></select></label><button id="traffic-garage" class="button secondary small" aria-expanded="false">Garage</button>',
      body: '<div class="traffic-instruments"><span id="traffic-coins">0 coins</span><span id="traffic-speed">0 km/h</span><label>Nitro <meter id="traffic-energy" min="0" max="100" value="100">100%</meter></label></div><div class="canvas-wrap traffic-wrap" id="game-board" tabindex="0" role="group" aria-label="Highway. Swipe or use left and right arrows to change lane. Down brakes; Up boosts."><canvas width="1000" height="1200" aria-hidden="true"></canvas></div><p class="drive-status" id="traffic-status">A clear gap always leads through. Look ahead, then choose your lane.</p><section class="traffic-garage" id="garage-panel" hidden aria-label="Car garage"><h3>Your little garage</h3><p id="garage-bank"></p><div class="garage-cars"></div><small>Every car handles equally. Coins are banked when a run ends.</small></section>',
      controls:
        '<div class="drive-actions"><button class="button primary" id="game-start">Start driving</button></div><div class="traffic-pad" aria-label="Highway driving controls"><button data-drive="left" aria-label="Change lane left">←<small>LANE</small></button><button data-drive="brake" aria-label="Brake">↓<small>BRAKE</small></button><button data-drive="boost" aria-label="Nitro">↑<small>NITRO</small></button><button data-drive="right" aria-label="Change lane right">→<small>LANE</small></button></div>',
      note: "Swipe / ← → change lane · Hold ↓ / S to brake · Hold ↑ / W for nitro · P / Space pauses",
    },
    ctx,
  );
  ui.el(".game-options").classList.add("journey-options");
  const area = ui.el("#game-board"),
    g = ui.el("canvas").getContext("2d");
  g.scale(2, 2);
  const input = drivingInput(
    root,
    events,
    {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowdown: "brake",
      s: "brake",
      arrowup: "boost",
      w: "boost",
    },
    (action) => {
      if (state !== "playing") return;
      if (action === "left" || action === "right")
        world = trafficLane(world, action === "left" ? -1 : 1);
    },
  );
  swipe(
    area,
    (dir) => {
      if (state === "playing" && ["left", "right"].includes(dir))
        world = trafficLane(world, dir === "left" ? -1 : 1);
    },
    events,
  );
  function garageUI() {
    ui.el("#garage-bank").textContent =
      `${garage.bank} coins saved. Collect the gold coins along the safe lane.`;
    ui.el(".garage-cars").innerHTML = TRAFFIC_CARS.map(
      (c) =>
        `<button data-car="${c.id}" aria-pressed="${c.id === selectedCar}" ${!garage.owned.includes(c.id) && garage.bank < c.cost ? "disabled" : ""}><span class="garage-car" style="--car:${c.color}" aria-hidden="true"></span><strong>${c.name}</strong><small>${c.id === selectedCar ? "Selected" : garage.owned.includes(c.id) ? "Choose car" : c.cost + " coins"}</small></button>`,
    ).join("");
  }
  function update() {
    ui.stat(
      "distance",
      `${Math.floor(world.distance)}${mode === "challenge" ? " / 1,500" : ""} m`,
    );
    ui.stat("score", world.score);
    ui.stat("best", get(`best:traffic-${mode}`, "—"));
    ui.el("#traffic-coins").textContent =
      `${world.coins} coins · ${world.near} close passes${world.combo > 1 ? " · ×" + world.combo + " streak" : ""}`;
    ui.el("#traffic-speed").textContent =
      `${Math.round(world.speed * 3.6)} km/h`;
    ui.el("#traffic-energy").value = world.energy;
    ui.el("#game-start").textContent =
      state === "ready"
        ? "Start driving"
        : state === "playing"
          ? "Pause"
          : state === "paused"
            ? "Resume"
            : "Drive again";
    ui.el("#traffic-mode").value = mode;
    ui.el("#traffic-mode").disabled = state !== "ready";
    ui.el("#traffic-status").textContent =
      state === "paused"
        ? "Paused. Your next lane can wait."
        : state === "over"
          ? "Coins banked. Another little drive awaits."
          : "Look far ahead · Gold coins mark a clear lane · Brake whenever you need more time";
  }
  function car(x, y, scale, color, player = false) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.fillStyle = "#07141d55";
    g.beginPath();
    g.ellipse(3, 8, 21, 36, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#17202a";
    g.fillRect(-23, -21, 8, 16);
    g.fillRect(15, -21, 8, 16);
    g.fillRect(-23, 14, 8, 16);
    g.fillRect(15, 14, 8, 16);
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(-19, -37, 38, 75, 10);
    g.fill();
    g.fillStyle = "#293d49";
    g.beginPath();
    g.roundRect(-14, -14, 28, 31, 6);
    g.fill();
    g.fillStyle = "#b9d8d5";
    g.fillRect(-12, -12, 24, 9);
    g.fillStyle = "#24333d";
    g.fillRect(-12, 7, 24, 8);
    g.fillStyle = "#fff0b7";
    g.fillRect(-15, -33, 7, 5);
    g.fillRect(8, -33, 7, 5);
    if (
      player &&
      input.held("boost") &&
      world.energy > 0 &&
      state === "playing"
    ) {
      g.fillStyle = "#91e1d0";
      g.beginPath();
      g.moveTo(-9, 37);
      g.lineTo(0, 56 + Math.sin(world.time * 30) * 6);
      g.lineTo(9, 37);
      g.fill();
    }
    g.restore();
  }
  const road = (relative) => {
    const t = Math.max(0, Math.min(1.18, 1 - relative / 240));
    return { y: 95 + t * t * 400, half: 34 + t * 172, scale: 0.22 + t * 1.08 };
  };
  function draw() {
    g.fillStyle = "#91b6ad";
    g.fillRect(0, 0, 500, 600);
    g.fillStyle = "#6a9180";
    g.beginPath();
    g.moveTo(0, 125);
    g.lineTo(55, 78);
    g.lineTo(130, 118);
    g.lineTo(210, 65);
    g.lineTo(330, 117);
    g.lineTo(410, 78);
    g.lineTo(500, 120);
    g.lineTo(500, 600);
    g.lineTo(0, 600);
    g.fill();
    g.fillStyle = "#d8c6a3";
    g.beginPath();
    g.moveTo(209, 95);
    g.lineTo(291, 95);
    g.lineTo(488, 600);
    g.lineTo(12, 600);
    g.closePath();
    g.fill();
    g.fillStyle = "#3a4651";
    g.beginPath();
    g.moveTo(216, 95);
    g.lineTo(284, 95);
    g.lineTo(471, 600);
    g.lineTo(29, 600);
    g.closePath();
    g.fill();
    for (let d = 24 - (world.distance % 24); d < 240; d += 24) {
      const a = road(d),
        b = road(d + 10);
      g.strokeStyle = "#f3e7bd";
      g.lineWidth = Math.max(1, a.scale * 3);
      for (const lane of [-1 / 3, 1 / 3]) {
        g.beginPath();
        g.moveTo(250 + a.half * lane, a.y);
        g.lineTo(250 + b.half * lane, b.y);
        g.stroke();
      }
    }
    for (const row of [...world.rows].reverse()) {
      const relative = row.at - world.distance;
      if (relative < -30 || relative > 240) continue;
      const p = road(relative);
      for (const lane of row.blocked)
        car(
          250 + ((lane - 1) * p.half * 2) / 3,
          p.y,
          p.scale,
          ["#d8aa91", "#b0bbd7", "#d9c98f", "#8dbfb7"][row.style],
        );
      if (!row.coin) {
        const c = road(relative - 17);
        g.fillStyle = "#ffdf83";
        g.beginPath();
        g.ellipse(
          250 + ((row.free - 1) * c.half * 2) / 3,
          c.y,
          c.scale * 8,
          c.scale * 11,
          0,
          0,
          Math.PI * 2,
        );
        g.fill();
        g.strokeStyle = "#b28c44";
        g.lineWidth = 2;
        g.stroke();
      }
    }
    car(
      250 + (world.x - 1) * 137,
      495,
      1.3,
      TRAFFIC_CARS.find((c) => c.id === selectedCar).color,
      true,
    );
    if (state !== "playing" && state !== "over") {
      g.fillStyle = "#111c30ac";
      g.fillRect(0, 0, 500, 600);
      g.fillStyle = "#e4edcf";
      g.textAlign = "center";
      g.font = "bold 27px Arial";
      g.fillText(
        state === "ready" ? "A little open road." : "Take a breather.",
        250,
        275,
      );
      g.font = "16px Arial";
      g.fillText(
        state === "ready"
          ? "Choose your mode. Start when ready."
          : "Select Resume to keep driving.",
        250,
        305,
      );
    }
  }
  function finish() {
    state = "over";
    input.clear();
    if (!rewarded) {
      rewarded = true;
      garage.bank += world.coins;
      set("traffic-garage", garage);
      record(`traffic-${mode}`, world.score);
    }
    garageUI();
    update();
    ctx.sound(world.status === "won" ? "win" : "lose");
    raceResult(
      area,
      world.status === "won"
        ? "A lovely little road trip."
        : "Every drive is a fresh start.",
      `${Math.floor(world.distance)} m · ${world.score} points · ${world.coins} coins saved. ${world.status === "won" ? "Challenge complete!" : "Look for the next clear lane and brake before tight traffic."}`,
      [["Drive again", restart]],
    );
    ui.say(
      world.status === "won"
        ? "Challenge complete. Your coins and record are saved."
        : "Run ended. Coins saved. Select Drive again to retry.",
    );
  }
  function restart() {
    world = newTraffic(mode);
    state = "ready";
    rewarded = false;
    input.clear();
    last = 0;
    root.querySelector(".race-result")?.remove();
    update();
    draw();
    ui.el("#game-start").focus({ preventScroll: true });
  }
  function pause() {
    if (state !== "playing") return;
    state = "paused";
    input.clear();
    update();
    draw();
  }
  function toggle() {
    if (state === "playing") pause();
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
      const steps = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < steps && world.status === "playing"; i++)
        world = stepTraffic(world, dt / steps, {
          brake: input.held("brake"),
          boost: input.held("boost"),
        });
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
  events.on(ui.el("#traffic-mode"), "change", (e) => {
    mode = e.target.value;
    set("traffic-mode", mode);
    restart();
  });
  events.on(ui.el("#traffic-garage"), "click", () => {
    pause();
    ui.el("#garage-panel").hidden = !ui.el("#garage-panel").hidden;
    ui.el("#traffic-garage").setAttribute(
      "aria-expanded",
      String(!ui.el("#garage-panel").hidden),
    );
    garageUI();
  });
  events.on(ui.el(".garage-cars"), "click", (e) => {
    const button = e.target.closest("[data-car]");
    if (!button) return;
    const id = button.dataset.car;
    if (!garage.owned.includes(id)) {
      const next = buyTrafficCar(garage, id);
      if (!next) return;
      garage = next;
      set("traffic-garage", garage);
    }
    selectedCar = id;
    set("traffic-car", id);
    garageUI();
    draw();
    ui.say(`${TRAFFIC_CARS.find((c) => c.id === id).name} selected.`);
  });
  garageUI();
  update();
  draw();
  raf = requestAnimationFrame(loop);
  return {
    restart,
    pause,
    isPlaying: () =>
      ["playing", "paused"].includes(state) && world.distance > 0,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      input.clear();
      events.destroy();
    },
  };
}
