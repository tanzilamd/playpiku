import { frame, listen, keyboardAllowed } from "./shared.js";
import {
  DEFENSE_MAPS,
  TOWER_TYPES,
  DEFENSE_WAVES,
  newDefense,
  buildable,
  buildTower,
  upgradeTower,
  sellTower,
  startDefenseWave,
  stepDefense,
  enemyPosition,
  towerStats,
} from "../engines/defense.js";
import { get, set, record } from "../store.js";
export function mount(root, ctx) {
  const events = listen();
  let mapId = Object.hasOwn(DEFENSE_MAPS, get("defense-map"))
      ? get("defense-map")
      : "meadow",
    world = newDefense(mapId),
    selectedType = "rapid",
    selectedCell = null,
    focusCell = 0,
    paused = false,
    speed = 1,
    raf,
    last = 0,
    lastHud = "",
    destroyed = false,
    reportedStatus = "build";
  const ui = frame(
    root,
    {
      stats: [
        ["Gold", 160, "gold"],
        ["Lives", 20, "lives"],
        ["Wave", "0 / 10", "wave"],
      ],
      options: `<label>Map <select id="defense-map">${Object.entries(
        DEFENSE_MAPS,
      )
        .map(([id, m]) => `<option value="${id}">${m.name}</option>`)
        .join(
          "",
        )}</select></label><span class="defense-enemies" id="enemy-count">Plan your first defense.</span>`,
      body:
        '<div class="canvas-wrap defense-wrap" id="game-board" role="group" aria-label="Tower Defense map. Select a grass square to preview a tower; confirm with Build below."><canvas width="1200" height="800" aria-hidden="true"></canvas><div class="defense-grid" role="group" aria-label="Build and tower selection grid"></div></div><div class="tower-choices" role="group" aria-label="Choose a tower">' +
        Object.entries(TOWER_TYPES)
          .map(
            ([id, t]) =>
              `<button data-tower-type="${id}" class="tower-choice" aria-pressed="${id === "rapid"}"><i style="--tower-color:${t.color}" aria-hidden="true"></i><strong>${t.name}</strong><small>${t.cost} gold</small></button>`,
          )
          .join("") +
        '</div><div class="tower-details"><h3 id="tower-title">Choose your first tower.</h3><p id="tower-detail">Pick a tower, tap empty grass to preview its range, then confirm Build.</p><div class="tower-actions"><button class="button primary" id="build-tower" disabled>Build</button><button class="button secondary" id="upgrade-tower" hidden>Upgrade</button><button class="button secondary" id="sell-tower" hidden>Sell</button></div></div>',
      controls:
        '<button class="button primary" id="game-start">Start wave 1</button><button class="button secondary" id="defense-pause" disabled>Pause</button><button class="button secondary" id="defense-speed">Speed: 1×</button>',
      note: "Build on grass, not the path · Tap a tower to upgrade or sell · Pause to plan · Arrow keys navigate cells, Enter selects",
    },
    ctx,
  );
  ui.el(".game-options").classList.add("defense-options");
  const area = ui.el("#game-board"),
    grid = ui.el(".defense-grid"),
    g = ui.el("canvas").getContext("2d"),
    motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  g.scale(2, 2);
  ui.el("#defense-map").value = mapId;
  function labels() {
    for (let i = 0; i < 96; i++) {
      const b = grid.children[i],
        t = world.towers.find((t) => t.cell === i);
      b.setAttribute(
        "aria-label",
        `Row ${Math.floor(i / 12) + 1}, column ${(i % 12) + 1}: ${t ? `${TOWER_TYPES[t.type].name} tower, level ${t.level}` : buildable(mapId, i) ? "empty grass" : "path, cannot build"}`,
      );
      b.classList.toggle("selected", i === selectedCell);
    }
  }
  function update() {
    ui.stat("gold", world.money);
    ui.stat("lives", world.lives);
    ui.stat("wave", `${world.wave} / 10`);
    ui.el("#enemy-count").textContent =
      world.status === "wave"
        ? `${world.enemies.length} on path · ${world.queue.length} arriving`
        : world.status === "build"
          ? "Take your time. The next wave waits for you."
          : world.status === "won"
            ? "All ten waves defended."
            : "Your next strategy starts here.";
    ui.el("#game-start").textContent =
      world.status === "build"
        ? `Start wave ${world.wave + 1}`
        : "Wave in progress";
    ui.el("#game-start").disabled = world.status !== "build";
    ui.el("#defense-pause").disabled = world.status !== "wave";
    ui.el("#defense-pause").textContent = paused ? "Resume" : "Pause";
    ui.el("#defense-speed").textContent = `Speed: ${speed}×`;
    const t = world.towers.find((t) => t.cell === selectedCell),
      build = ui.el("#build-tower"),
      upgrade = ui.el("#upgrade-tower"),
      sell = ui.el("#sell-tower");
    build.hidden = !!t;
    upgrade.hidden = sell.hidden = !t;
    const over = ["won", "lost"].includes(world.status);
    if (t) {
      const stats = towerStats(t);
      ui.el("#tower-title").textContent =
        `${stats.name} · Level ${t.level} / 3`;
      ui.el("#tower-detail").textContent =
        `${stats.damage} damage · ${stats.range} range${t.type === "cannon" ? " · Splash damage" : t.type === "frost" ? " · Slows enemies" : ""}`;
      upgrade.textContent =
        stats.upgradeCost === null
          ? "Fully upgraded"
          : `Upgrade (${stats.upgradeCost} gold)`;
      upgrade.disabled =
        over || stats.upgradeCost === null || world.money < stats.upgradeCost;
      sell.textContent = `Sell (+${Math.floor(t.spent * 0.7)} gold)`;
      sell.disabled = over;
    } else {
      const type = TOWER_TYPES[selectedType];
      ui.el("#tower-title").textContent =
        selectedCell === null
          ? `${type.name} · Choose a grass square`
          : `Build ${type.name} here?`;
      ui.el("#tower-detail").textContent =
        `${type.damage} damage · ${type.range} range${selectedType === "cannon" ? " · Hits nearby enemies too" : selectedType === "frost" ? " · Slows enemies by 45%" : " · Quick single-target shots"}. Gold is spent only when you confirm.`;
      build.textContent =
        world.money >= type.cost
          ? `Build (${type.cost} gold)`
          : `Need ${type.cost - world.money} more gold`;
      build.disabled =
        over ||
        selectedCell === null ||
        !buildable(mapId, selectedCell) ||
        world.money < type.cost;
    }
    root
      .querySelectorAll("[data-tower-type]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.towerType === selectedType),
      );
  }
  function draw() {
    const path = DEFENSE_MAPS[mapId].path;
    g.fillStyle = {
      meadow: "#294735",
      river: "#284948",
      orchard: "#394a38",
      ridge: "#514638",
    }[mapId];
    g.fillRect(0, 0, 600, 400);
    g.strokeStyle = "#8ca3761e";
    g.lineWidth = 1;
    for (let x = 0; x <= 600; x += 50) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 400);
      g.stroke();
    }
    for (let y = 0; y <= 400; y += 50) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(600, y);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(path[0].x * 50 + 25, path[0].y * 50 + 25);
    for (const p of path.slice(1)) g.lineTo(p.x * 50 + 25, p.y * 50 + 25);
    g.strokeStyle =
      mapId === "ridge"
        ? "#d2b28c"
        : mapId === "orchard"
          ? "#c4b799"
          : "#c8b38b";
    g.lineWidth = 38;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.stroke();
    g.strokeStyle = "#e9d6a733";
    g.lineWidth = 3;
    g.setLineDash([5, 11]);
    g.stroke();
    g.setLineDash([]);
    if (selectedCell !== null) {
      const t = world.towers.find((t) => t.cell === selectedCell),
        stats = t ? towerStats(t) : TOWER_TYPES[selectedType],
        x = (selectedCell % 12) * 50 + 25,
        y = Math.floor(selectedCell / 12) * 50 + 25;
      if (buildable(mapId, selectedCell)) {
        g.fillStyle = stats.color + "20";
        g.strokeStyle = stats.color + "99";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(x, y, stats.range, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        if (!t) {
          g.fillStyle = stats.color + "88";
          g.beginPath();
          g.arc(x, y, 14, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    for (const t of world.towers) {
      const x = (t.cell % 12) * 50 + 25,
        y = Math.floor(t.cell / 12) * 50 + 25,
        color = TOWER_TYPES[t.type].color;
      g.fillStyle = "#182e28";
      g.beginPath();
      g.roundRect(x - 17, y - 17, 34, 34, 7);
      g.fill();
      g.fillStyle = color;
      g.beginPath();
      g.arc(x, y, 11 + t.level, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#244233";
      g.lineWidth = t.type === "cannon" ? 8 : 5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y - 17);
      g.stroke();
      g.fillStyle = "#f9f0ce";
      g.font = "bold 10px Arial";
      g.textAlign = "center";
      g.fillText(String(t.level), x, y + 27);
    }
    for (const e of world.enemies) {
      const p = enemyPosition(mapId, e.distance),
        r = e.boss ? 15 : 10;
      g.fillStyle =
        e.slowUntil > world.time
          ? "#9dcfe5"
          : e.boss
            ? "#b194d7"
            : e.armor
              ? "#d2a871"
              : "#edac8e";
      g.beginPath();
      g.roundRect(p.x - r, p.y - r, r * 2, r * 2, 6);
      g.fill();
      g.fillStyle = "#364336";
      g.fillRect(p.x - 5, p.y - 3, 3, 3);
      g.fillRect(p.x + 3, p.y - 3, 3, 3);
      g.fillStyle = "#172a28";
      g.fillRect(p.x - 14, p.y - r - 8, 28, 4);
      g.fillStyle = "#c7ee8c";
      g.fillRect(p.x - 14, p.y - r - 8, 28 * Math.max(0, e.hp / e.maxHp), 4);
    }
    if (
      !motion.matches &&
      !document.documentElement.classList.contains("reduce-motion")
    )
      for (const shot of world.shots) {
        g.strokeStyle = shot.color;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(shot.from.x, shot.from.y);
        g.lineTo(shot.to.x, shot.to.y);
        g.stroke();
        if (shot.splash) {
          g.strokeStyle = shot.color + "88";
          g.beginPath();
          g.arc(shot.to.x, shot.to.y, 22, 0, Math.PI * 2);
          g.stroke();
        }
      }
  }
  function select(cell) {
    if (["won", "lost"].includes(world.status)) return;
    focusCell = cell;
    const previous = grid.querySelector('[tabindex="0"]');
    if (previous) previous.tabIndex = -1;
    grid.children[cell].tabIndex = 0;
    if (!buildable(mapId, cell)) {
      selectedCell = null;
      labels();
      update();
      draw();
      ui.say("The path stays clear for enemies. Choose an empty grass square.");
      return;
    }
    selectedCell = cell;
    labels();
    update();
    draw();
    ui.say(
      world.towers.some((t) => t.cell === cell)
        ? "Tower selected. Upgrade it or sell it below."
        : "Range preview shown. Confirm Build below to spend gold.",
    );
  }
  function restart() {
    world = newDefense(mapId);
    selectedCell = null;
    focusCell = 0;
    paused = false;
    speed = 1;
    last = 0;
    lastHud = "";
    reportedStatus = "build";
    ui.el(".defense-result")?.remove();
    grid.innerHTML = Array.from(
      { length: 96 },
      (_, i) =>
        `<button data-defense-cell="${i}" tabindex="${i === 0 ? 0 : -1}"></button>`,
    ).join("");
    labels();
    update();
    draw();
    ui.say(
      "Build a few towers, then start wave one. A Sprout and Cannon are a good first defense.",
    );
  }
  function pause() {
    if (world.status !== "wave" || paused) return;
    paused = true;
    update();
    ui.say(
      "Wave paused. You can still build and upgrade. Select Resume to continue.",
    );
  }
  function finish() {
    record(
      "defense-" + mapId,
      world.status === "won" ? 10 : Math.max(0, world.wave - 1),
    );
    paused = false;
    update();
    ctx.sound(world.status === "won" ? "win" : "lose");
    const result = document.createElement("section");
    result.className = "defense-result";
    const heading = document.createElement("h2");
    heading.textContent =
      world.status === "won"
        ? "A little kingdom, well defended."
        : "A fresh strategy. A fresh start.";
    const detail = document.createElement("p");
    detail.textContent =
      world.status === "won"
        ? `All 10 waves cleared · ${world.lives} lives left · ${world.kills} enemies stopped.`
        : `Reached wave ${world.wave} · ${world.kills} enemies stopped. Try building near bends and upgrading early.`;
    const button = document.createElement("button");
    button.className = "button primary";
    button.textContent = "Build again";
    button.onclick = restart;
    result.append(heading, detail, button);
    area.insertAdjacentElement("afterend", result);
    ui.say(
      world.status === "won"
        ? "Victory! All ten waves defended."
        : `Defense ended at wave ${world.wave}. Try another strategy.`,
    );
  }
  function loop(time) {
    if (destroyed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.04) : 0;
    last = time;
    if (!paused && world.status === "wave") {
      const count = Math.max(1, Math.ceil(dt * speed * 60));
      for (let i = 0; i < count && world.status === "wave"; i++)
        world = stepDefense(world, (dt * speed) / count);
      if (world.status !== reportedStatus) {
        reportedStatus = world.status;
        if (world.status === "won" || world.status === "lost") finish();
        else if (world.status === "build") {
          record("defense-" + mapId, world.wave);
          ctx.sound("win");
          ui.say(
            `Wave ${world.wave} cleared. Build or upgrade before the next wave.`,
          );
        }
      }
    }
    const stamp = [
      world.money,
      world.lives,
      world.wave,
      world.status,
      world.enemies.length,
      world.queue.length,
      paused,
      speed,
    ].join(":");
    if (stamp !== lastHud) {
      lastHud = stamp;
      update();
    }
    draw();
    raf = requestAnimationFrame(loop);
  }
  events.on(grid, "click", (e) => {
    const b = e.target.closest("[data-defense-cell]");
    if (b) select(Number(b.dataset.defenseCell));
  });
  events.on(grid, "keydown", (e) => {
    const b = e.target.closest("[data-defense-cell]");
    if (!b) return;
    const i = Number(b.dataset.defenseCell);
    let next = i;
    if (e.key === "ArrowLeft") next = Math.max(i - (i % 12), i - 1);
    else if (e.key === "ArrowRight") next = Math.min(i - (i % 12) + 11, i + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, i - 12);
    else if (e.key === "ArrowDown") next = Math.min(95, i + 12);
    else return;
    e.preventDefault();
    b.tabIndex = -1;
    focusCell = next;
    grid.children[next].tabIndex = 0;
    grid.children[next].focus();
  });
  root.querySelectorAll("[data-tower-type]").forEach((b) =>
    events.on(b, "click", () => {
      selectedType = b.dataset.towerType;
      selectedCell = null;
      labels();
      update();
      draw();
    }),
  );
  events.on(ui.el("#build-tower"), "click", () => {
    const next = buildTower(world, selectedType, selectedCell);
    if (!next) {
      ui.say(
        "That tower cannot be built here yet. Check the gold cost and choose empty grass.",
      );
      return;
    }
    world = next;
    labels();
    update();
    draw();
    ctx.sound();
    ui.say(
      `${TOWER_TYPES[selectedType].name} built. Tap it any time to upgrade.`,
    );
  });
  events.on(ui.el("#upgrade-tower"), "click", () => {
    const t = world.towers.find((t) => t.cell === selectedCell),
      next = t && upgradeTower(world, t.id);
    if (!next) return;
    world = next;
    labels();
    update();
    draw();
    ctx.sound("win");
    ui.say("Tower upgraded. More power for your defense.");
  });
  events.on(ui.el("#sell-tower"), "click", () => {
    const t = world.towers.find((t) => t.cell === selectedCell),
      next = t && sellTower(world, t.id);
    if (!next) return;
    world = next;
    labels();
    update();
    draw();
    ui.say("Tower sold. Seventy percent of its total cost returned.");
  });
  events.on(ui.el("#game-start"), "click", () => {
    world = startDefenseWave(world);
    reportedStatus = world.status;
    last = 0;
    update();
    ui.say(
      `Wave ${world.wave} started. You can build during the wave, or pause to plan.`,
    );
  });
  events.on(ui.el("#defense-pause"), "click", () => {
    if (paused) {
      paused = false;
      last = 0;
      update();
      ui.say("Wave resumed.");
    } else pause();
  });
  events.on(ui.el("#defense-speed"), "click", () => {
    speed = speed === 1 ? 2 : 1;
    update();
  });
  events.on(document, "keydown", (e) => {
    if (keyboardAllowed(e) && !e.repeat && e.key.toLowerCase() === "p") {
      e.preventDefault();
      if (paused) {
        paused = false;
        last = 0;
        update();
      } else pause();
    }
  });
  events.on(window, "blur", pause);
  events.on(ui.el("#defense-map"), "change", (e) => {
    if (world.towers.length || world.wave) {
      e.target.value = mapId;
      ctx.toast("Restart first to change the map.");
      return;
    }
    mapId = e.target.value;
    set("defense-map", mapId);
    restart();
  });
  restart();
  raf = requestAnimationFrame(loop);
  return {
    restart,
    pause,
    isPlaying: () =>
      !["won", "lost"].includes(world.status) &&
      (world.wave > 0 || world.towers.length > 0),
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      events.destroy();
    },
  };
}
