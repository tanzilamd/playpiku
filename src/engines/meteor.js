export const METEOR_WAVE_SIZE = 8;
export const METEOR_GUARDIANS = [
  {
    id: "garden",
    name: "Garden Guardian",
    color: "#bc98ce",
    hint: "Watch the gaps in the three-shot fan.",
  },
  {
    id: "tide",
    name: "Tide Warden",
    color: "#94d0d3",
    hint: "Move away from the marked aim line.",
  },
  {
    id: "solar",
    name: "Solar Moth",
    color: "#efc68e",
    hint: "Find the open side between each sweeping fan.",
  },
];
export function newMeteor() {
  return {
    ship: { x: 200, y: 492 },
    health: 3,
    shield: 1,
    power: 1,
    powerTime: 0,
    invincible: 0,
    score: 0,
    wave: 1,
    kills: 0,
    spawned: 0,
    spawnTimer: 0.8,
    shotTimer: 0,
    enemyShotTimer: 1,
    time: 0,
    transition: 0,
    enemies: [],
    shots: [],
    hostile: [],
    pickups: [],
    particles: [],
    boss: null,
    nextId: 1,
    over: false,
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function damageMeteor(s) {
  if (s.invincible > 0 || s.over) return false;
  if (s.shield > 0) s.shield--;
  else s.health--;
  s.invincible = 1.7;
  if (s.health <= 0) s.over = true;
  return true;
}
export function meteorPickup(s, type) {
  if (type === "shield") s.shield = Math.min(3, s.shield + 1);
  else if (type === "repair") s.health = Math.min(3, s.health + 1);
  else {
    s.power = Math.min(3, s.power + 1);
    s.powerTime = 12;
  }
  s.score += 30;
}
function reward(s, e, random, events) {
  s.score += e.kind === "rock" ? 65 : 100;
  s.kills++;
  events.push("hit");
  if (s.kills % 4 === 0) {
    const type =
      s.health < 3 && random() < 0.45
        ? "repair"
        : random() < 0.45
          ? "shield"
          : "power";
    s.pickups.push({ x: e.x, y: e.y, type });
  }
  for (let i = 0; i < 7; i++)
    s.particles.push({
      x: e.x,
      y: e.y,
      vx: (random() - 0.5) * 150,
      vy: (random() - 0.5) * 150,
      life: 0.45,
    });
}
export function stepMeteor(s, dt, input = {}, random = Math.random) {
  if (s.over || dt <= 0 || !Number.isFinite(dt)) return [];
  dt = Math.min(dt, 0.05);
  const events = [];
  s.time += dt;
  s.invincible = Math.max(0, s.invincible - dt);
  s.powerTime = Math.max(0, s.powerTime - dt);
  if (s.powerTime === 0) s.power = 1;
  const speed = 260,
    dx = (input.right ? 1 : 0) - (input.left ? 1 : 0),
    dy = (input.down ? 1 : 0) - (input.up ? 1 : 0),
    length = Math.hypot(dx, dy) || 1;
  if (
    input.target &&
    Number.isFinite(input.target.x) &&
    Number.isFinite(input.target.y)
  ) {
    const tx = input.target.x - s.ship.x,
      ty = input.target.y - s.ship.y,
      d = Math.hypot(tx, ty),
      step = Math.min(d, speed * 1.7 * dt);
    if (d) {
      s.ship.x += (tx / d) * step;
      s.ship.y += (ty / d) * step;
    }
  } else {
    s.ship.x += (dx / length) * speed * dt;
    s.ship.y += (dy / length) * speed * dt;
  }
  s.ship.x = clamp(s.ship.x, 22, 378);
  s.ship.y = clamp(s.ship.y, 305, 540);
  s.shotTimer -= dt;
  if (s.shotTimer <= 0) {
    for (let i = 0; i < s.power; i++)
      s.shots.push({
        x: s.ship.x + (i - (s.power - 1) / 2) * 12,
        y: s.ship.y - 20,
        vx: (i - (s.power - 1) / 2) * 38,
        vy: -530,
      });
    s.shotTimer += 0.19;
  }
  if (s.transition > 0) {
    s.transition = Math.max(0, s.transition - dt);
    if (s.transition === 0) {
      s.wave++;
      s.spawned = 0;
      s.spawnTimer = 0.7;
      s.shield = Math.min(3, s.shield + 1);
      events.push("wave");
    }
  } else if (!s.boss && s.spawned < METEOR_WAVE_SIZE) {
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      const x = 36 + random() * 328,
        kind = s.spawned % 3 === 2 ? "rock" : "drone";
      s.enemies.push({
        id: s.nextId++,
        x,
        y: -25,
        originX: x,
        phase: random() * Math.PI * 2,
        r: kind === "rock" ? 19 : 16,
        hp: kind === "rock" ? 2 : 1,
        kind,
        speed: Math.min(110, 50 + s.wave * 5),
        age: 0,
        fire: 1.6 + random(),
      });
      s.spawned++;
      s.spawnTimer = Math.max(0.5, 1.05 - s.wave * 0.035);
    }
  } else if (!s.boss && s.spawned === METEOR_WAVE_SIZE && !s.enemies.length) {
    if (s.wave % 3 === 0 && s.spawned !== -1) {
      const variant = (Math.floor(s.wave / 3) - 1) % METEOR_GUARDIANS.length;
      s.boss = {
        variant,
        volley: 0,
        warning: null,
        gift: false,
        x: 200,
        y: -65,
        hp: 28 + Math.floor(s.wave / 3) * 8,
        maxHp: 28 + Math.floor(s.wave / 3) * 8,
        age: 0,
        fire: 1.2,
        r: 43,
      };
      s.spawned = -1;
      events.push("boss");
    } else {
      s.transition = 2;
      events.push("clear");
    }
  }
  if (s.boss) {
    const b = s.boss;
    b.age += dt;
    const variant = b.variant || 0;
    b.x =
      200 +
      Math.sin(b.age * (variant === 1 ? 0.8 : 0.65)) *
        (variant === 2 ? 115 : 125);
    b.y = Math.min(102, b.y + 65 * dt);
    b.fire -= dt;
    if (variant === 1 && b.y >= 70 && b.fire <= 0.6 && !b.warning)
      b.warning = { ...s.ship };
    if (b.y >= 70 && b.fire <= 0) {
      const speed = 155 + Math.min(55, s.wave * 3);
      if (variant === 1) {
        const target = b.warning || s.ship,
          angle = Math.atan2(target.y - (b.y + 30), target.x - b.x);
        for (const offset of [-0.16, 0, 0.16])
          s.hostile.push({
            x: b.x,
            y: b.y + 30,
            vx: Math.cos(angle + offset) * speed,
            vy: Math.sin(angle + offset) * speed,
            r: 6,
          });
      } else if (variant === 2) {
        const lean = b.volley % 2 ? -0.27 : 0.27;
        for (const offset of [-0.58, -0.29, 0, 0.29, 0.58]) {
          const angle = Math.PI / 2 + offset + lean;
          s.hostile.push({
            x: b.x,
            y: b.y + 30,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 6,
          });
        }
      } else
        for (let i = -1; i <= 1; i++)
          s.hostile.push({ x: b.x, y: b.y + 30, vx: i * 65, vy: speed, r: 6 });
      b.volley = (b.volley || 0) + 1;
      b.warning = null;
      b.fire =
        variant === 0
          ? Math.max(0.85, 1.3 - s.wave * 0.02)
          : variant === 1
            ? 1.7
            : 1.55;
    }
    if (!b.gift && b.hp <= b.maxHp / 2) {
      b.gift = true;
      s.pickups.push({ x: b.x, y: b.y + 35, type: "power" });
      events.push("boss-gift");
    }
  }

  for (const e of s.enemies) {
    e.age += dt;
    e.y += e.speed * dt;
    e.x = clamp(
      e.originX +
        Math.sin(e.age * 1.5 + e.phase) * (e.kind === "rock" ? 8 : 24),
      24,
      376,
    );
    e.fire -= dt;
    if (e.kind === "drone" && e.y > 30 && e.y < 330 && e.fire <= 0) {
      const angle = Math.atan2(s.ship.y - e.y, s.ship.x - e.x);
      s.hostile.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * 115,
        vy: Math.sin(angle) * 115,
        r: 5,
      });
      e.fire = 2.5;
    }
  }
  for (const b of s.shots) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    for (const e of s.enemies) {
      if (e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 4) {
        e.hp--;
        b.y = -100;
        break;
      }
    }
    if (s.boss && Math.hypot(b.x - s.boss.x, b.y - s.boss.y) < s.boss.r + 4) {
      s.boss.hp--;
      b.y = -100;
    }
  }
  for (const e of s.enemies) if (e.hp <= 0) reward(s, e, random, events);
  s.enemies = s.enemies.filter((e) => e.hp > 0 && e.y < 590);
  s.shots = s.shots.filter((b) => b.y > -30 && b.x > -10 && b.x < 410);
  for (const b of s.hostile) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (Math.hypot(b.x - s.ship.x, b.y - s.ship.y) < b.r + 9) {
      if (damageMeteor(s)) events.push("damage");
      b.y = 650;
    }
  }
  for (const e of s.enemies)
    if (Math.hypot(e.x - s.ship.x, e.y - s.ship.y) < e.r + 10) {
      if (damageMeteor(s)) events.push("damage");
      e.y = 650;
    }
  s.enemies = s.enemies.filter((e) => e.y < 590);
  s.hostile = s.hostile.filter(
    (b) => b.y < 590 && b.y > -20 && b.x > -20 && b.x < 420,
  );
  for (const p of s.pickups) {
    p.y += 85 * dt;
    if (Math.hypot(p.x - s.ship.x, p.y - s.ship.y) < 25) {
      meteorPickup(s, p.type);
      p.y = 650;
      events.push("pickup");
    }
  }
  s.pickups = s.pickups.filter((p) => p.y < 590);
  for (const p of s.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  s.particles = s.particles.filter((p) => p.life > 0);
  if (s.boss && s.boss.hp <= 0) {
    s.score += 1000 + s.wave * 100;
    s.boss = null;
    s.transition = 2;
    s.health = Math.min(3, s.health + 1);
    s.hostile = [];
    events.push("boss-clear");
  }
  return events;
}
