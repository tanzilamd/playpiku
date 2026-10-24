const cells = (a) => a.map(([x, y]) => ({ x, y }));
export const DEFENSE_MAPS = {
  meadow: {
    name: "Meadow Trail",
    path: cells([
      [-1, 4],
      [0, 4],
      [1, 4],
      [2, 4],
      [2, 3],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [5, 3],
      [5, 4],
      [5, 5],
      [6, 5],
      [7, 5],
      [8, 5],
      [8, 4],
      [8, 3],
      [9, 3],
      [10, 3],
      [11, 3],
      [12, 3],
    ]),
  },
  river: {
    name: "River Bend",
    path: cells([
      [-1, 2],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [3, 3],
      [3, 4],
      [3, 5],
      [4, 5],
      [5, 5],
      [6, 5],
      [7, 5],
      [7, 4],
      [7, 3],
      [7, 2],
      [8, 2],
      [9, 2],
      [10, 2],
      [10, 3],
      [10, 4],
      [10, 5],
      [11, 5],
      [12, 5],
    ]),
  },
};
export const TOWER_TYPES = {
  rapid: {
    name: "Sprout",
    cost: 60,
    damage: 10,
    cooldown: 0.6,
    range: 105,
    color: "#c5ec8a",
  },
  cannon: {
    name: "Cannon",
    cost: 100,
    damage: 23,
    cooldown: 1.2,
    range: 120,
    color: "#f2bd8b",
  },
  frost: {
    name: "Frost",
    cost: 80,
    damage: 3,
    cooldown: 0.8,
    range: 108,
    color: "#a9d6f0",
  },
};
export const DEFENSE_WAVES = [
  { count: 5, hp: 26, speed: 42 },
  { count: 7, hp: 35, speed: 44 },
  { count: 6, hp: 29, speed: 67 },
  { count: 8, hp: 54, speed: 45 },
  { count: 6, hp: 47, speed: 47, boss: 260 },
  { count: 9, hp: 55, speed: 65 },
  { count: 8, hp: 88, speed: 45, armor: 2 },
  { count: 10, hp: 92, speed: 50 },
  { count: 12, hp: 73, speed: 74 },
  { count: 11, hp: 112, speed: 52, boss: 700 },
];
export function pathGeometry(mapId) {
  const points = DEFENSE_MAPS[mapId].path.map((p) => ({
      x: p.x * 50 + 25,
      y: p.y * 50 + 25,
    })),
    lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(
      lengths.at(-1) +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  return { points, lengths, total: lengths.at(-1) };
}
const geometry = Object.fromEntries(
  Object.keys(DEFENSE_MAPS).map((id) => [id, pathGeometry(id)]),
);
export function enemyPosition(mapId, distance) {
  const g = geometry[mapId];
  for (let i = 1; i < g.points.length; i++)
    if (distance <= g.lengths[i]) {
      const t = Math.max(
        0,
        (distance - g.lengths[i - 1]) / (g.lengths[i] - g.lengths[i - 1]),
      );
      return {
        x: g.points[i - 1].x + (g.points[i].x - g.points[i - 1].x) * t,
        y: g.points[i - 1].y + (g.points[i].y - g.points[i - 1].y) * t,
      };
    }
  return g.points.at(-1);
}
export function buildable(mapId, cell) {
  return (
    Number.isInteger(cell) &&
    cell >= 0 &&
    cell < 96 &&
    !DEFENSE_MAPS[mapId].path.some(
      (p) => p.x === cell % 12 && p.y === Math.floor(cell / 12),
    )
  );
}
export function newDefense(mapId = "meadow") {
  return {
    mapId: Object.hasOwn(DEFENSE_MAPS, mapId) ? mapId : "meadow",
    money: 160,
    lives: 20,
    wave: 0,
    status: "build",
    enemies: [],
    towers: [],
    queue: [],
    spawnIn: 0,
    time: 0,
    shots: [],
    nextId: 1,
    kills: 0,
  };
}
export function towerStats(t) {
  const type = TOWER_TYPES[t.type];
  return {
    ...type,
    damage: Math.round(type.damage * 1.7 ** (t.level - 1)),
    range: type.range + (t.level - 1) * 12,
    upgradeCost:
      t.level >= 3
        ? null
        : Math.round(type.cost * (t.level === 1 ? 0.75 : 1.15)),
  };
}
export function buildTower(s, type, cell) {
  if (
    !["build", "wave"].includes(s.status) ||
    !Object.hasOwn(TOWER_TYPES, type) ||
    !buildable(s.mapId, cell) ||
    s.towers.some((t) => t.cell === cell) ||
    s.money < TOWER_TYPES[type].cost
  )
    return null;
  return {
    ...s,
    money: s.money - TOWER_TYPES[type].cost,
    nextId: s.nextId + 1,
    towers: [
      ...s.towers,
      {
        id: s.nextId,
        cell,
        type,
        level: 1,
        spent: TOWER_TYPES[type].cost,
        nextFire: s.time,
      },
    ],
  };
}
export function upgradeTower(s, id) {
  const t = s.towers.find((t) => t.id === id);
  if (!t || !["build", "wave"].includes(s.status)) return null;
  const cost = towerStats(t).upgradeCost;
  if (cost === null || s.money < cost) return null;
  return {
    ...s,
    money: s.money - cost,
    towers: s.towers.map((a) =>
      a.id === id
        ? { ...a, level: a.level + 1, spent: a.spent + cost, nextFire: s.time }
        : a,
    ),
  };
}
export function sellTower(s, id) {
  const tower = s.towers.find((t) => t.id === id);
  if (!tower || !["build", "wave"].includes(s.status)) return null;
  return {
    ...s,
    money: s.money + Math.floor(tower.spent * 0.7),
    towers: s.towers.filter((t) => t.id !== id),
  };
}
export function startDefenseWave(s) {
  if (s.status !== "build" || s.wave >= DEFENSE_WAVES.length) return s;
  const wave = s.wave + 1,
    c = DEFENSE_WAVES[wave - 1],
    queue = Array.from({ length: c.count }, (_, i) => ({
      hp: i === c.count - 1 && c.boss ? c.boss : c.hp,
      maxHp: i === c.count - 1 && c.boss ? c.boss : c.hp,
      speed: i === c.count - 1 && c.boss ? 28 : c.speed,
      armor: c.armor || 0,
      boss: !!(i === c.count - 1 && c.boss),
      bounty: i === c.count - 1 && c.boss ? 35 : 10,
    }));
  return { ...s, wave, status: "wave", queue, spawnIn: 0, shots: [] };
}
export function stepDefense(state, dt) {
  if (state.status !== "wave") return state;
  const s = {
      ...state,
      enemies: state.enemies.map((e) => ({ ...e })),
      towers: state.towers.map((t) => ({ ...t })),
      queue: [...state.queue],
      shots: state.shots.filter((e) => e.until > state.time),
    },
    elapsed = Math.max(0, Math.min(dt, 1 / 60));
  s.time += elapsed;
  s.spawnIn -= elapsed;
  while (s.spawnIn <= 0 && s.queue.length) {
    const template = s.queue.shift();
    s.enemies.push({ ...template, id: s.nextId++, distance: 0, slowUntil: 0 });
    s.spawnIn += 0.85;
  }
  for (const e of s.enemies)
    e.distance += e.speed * (e.slowUntil > s.time ? 0.55 : 1) * elapsed;
  const escaped = s.enemies.filter(
    (e) => e.distance >= geometry[s.mapId].total,
  );
  s.lives = Math.max(
    0,
    s.lives - escaped.reduce((sum, e) => sum + (e.boss ? 5 : 1), 0),
  );
  s.enemies = s.enemies.filter((e) => e.distance < geometry[s.mapId].total);
  if (s.lives <= 0) {
    s.status = "lost";
    s.shots = [];
    return s;
  }
  for (const t of s.towers) {
    if (t.nextFire > s.time) continue;
    const stats = towerStats(t),
      position = {
        x: (t.cell % 12) * 50 + 25,
        y: Math.floor(t.cell / 12) * 50 + 25,
      },
      targets = s.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            Math.hypot(
              enemyPosition(s.mapId, e.distance).x - position.x,
              enemyPosition(s.mapId, e.distance).y - position.y,
            ) <= stats.range,
        )
        .sort((a, b) => b.distance - a.distance),
      target = targets[0];
    if (!target) continue;
    t.nextFire = s.time + stats.cooldown;
    const point = enemyPosition(s.mapId, target.distance);
    s.shots.push({
      from: position,
      to: point,
      color: stats.color,
      until: s.time + 0.13,
      splash: t.type === "cannon",
    });
    for (const e of s.enemies) {
      const p = enemyPosition(s.mapId, e.distance);
      if (
        e.hp > 0 &&
        (e.id === target.id ||
          (t.type === "cannon" &&
            Math.hypot(p.x - point.x, p.y - point.y) <= 65))
      ) {
        e.hp -= Math.max(1, stats.damage - e.armor);
        if (t.type === "frost") e.slowUntil = s.time + 1.5;
      }
    }
  }
  const killed = s.enemies.filter((e) => e.hp <= 0);
  s.money += killed.reduce((sum, e) => sum + e.bounty, 0);
  s.kills += killed.length;
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  if (!s.enemies.length && !s.queue.length) {
    s.status = s.wave === DEFENSE_WAVES.length ? "won" : "build";
    s.money += 20;
    s.shots = [];
  }
  return s;
}
