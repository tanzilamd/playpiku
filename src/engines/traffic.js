export const TRAFFIC_CARS = [
  { id: "mint", name: "Mint Mini", color: "#c9e99b", cost: 0 },
  { id: "coral", name: "Coral Coupe", color: "#f1a58e", cost: 50 },
  { id: "gold", name: "Golden Comet", color: "#f4d389", cost: 120 },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function random(s, n) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return Math.floor((s.seed / 4294967296) * n);
}
function spawn(s) {
  const previous = s.rows.at(-1);
  const free = clamp((previous?.free ?? 1) + random(s, 3) - 1, 0, 2);
  const blocked = [0, 1, 2].filter((lane) => lane !== free);
  if (s.nextRow % 3 === 0) blocked.splice(random(s, 2), 1);
  s.rows.push({
    id: s.nextRow++,
    at: s.nextAt,
    free,
    blocked,
    passed: false,
    coin: false,
    near: false,
    style: random(s, 4),
  });
  // Even at maximum boost speed, a row leaves time for two lane changes.
  s.nextAt += 76 + random(s, 24);
}
export function newTraffic(mode = "endless", seed = Date.now()) {
  const s = {
    mode: mode === "challenge" ? "challenge" : "endless",
    seed: Number(seed) >>> 0,
    status: "playing",
    distance: 0,
    time: 0,
    lane: 1,
    x: 1,
    speed: 0,
    energy: 100,
    coins: 0,
    near: 0,
    combo: 0,
    bonus: 0,
    score: 0,
    rows: [],
    nextAt: 110,
    nextRow: 0,
  };
  while (s.nextAt < 450) spawn(s);
  return s;
}
export function trafficLane(input, direction) {
  if (input.status !== "playing" || ![-1, 1].includes(direction)) return input;
  return { ...input, lane: clamp(input.lane + direction, 0, 2) };
}
export function stepTraffic(input, dt, controls = {}) {
  if (input.status !== "playing" || !Number.isFinite(dt) || dt <= 0)
    return input;
  dt = Math.min(dt, 0.05);
  const s = { ...input, rows: input.rows.map((row) => ({ ...row })) };
  const previous = s.distance,
    previousX = s.x;
  const boost = controls.boost && !controls.brake && s.energy > 0;
  const cruising = 30 + Math.min(22, s.distance / 200);
  const target = controls.brake ? 16 : boost ? cruising * 1.27 : cruising;
  s.speed += clamp(target - s.speed, -45 * dt, 30 * dt);
  s.energy = clamp(
    s.energy + (controls.boost && !controls.brake ? -27 : 7) * dt,
    0,
    100,
  );
  s.x += clamp(s.lane - s.x, -5 * dt, 5 * dt);
  s.time += dt;
  s.distance += s.speed * dt;
  for (const row of s.rows) {
    const intersects = previous <= row.at + 3.5 && s.distance >= row.at - 3.5;
    if (intersects) {
      const t =
        s.distance === previous
          ? 1
          : clamp((row.at - previous) / (s.distance - previous), 0, 1);
      const x = previousX + (s.x - previousX) * t;
      if (row.blocked.some((lane) => Math.abs(x - lane) < 0.34)) {
        s.status = "crashed";
        break;
      }
    }
    if (!row.coin && s.distance >= row.at - 17) {
      row.coin = true;
      if (Math.abs(s.x - row.free) < 0.4 && previous <= row.at - 15) {
        s.coins++;
        s.combo = Math.min(5, s.combo + 1);
        s.bonus += (s.combo - 1) * 5;
      } else s.combo = 0;
    }
    if (!row.near && s.distance > row.at + 4) {
      row.near = true;
      if (
        row.blocked.some(
          (lane) => Math.abs(s.x - lane) >= 0.34 && Math.abs(s.x - lane) < 1.15,
        )
      )
        s.near++;
    }
    row.passed = s.distance > row.at + 12;
  }
  s.rows = s.rows.filter((row) => s.distance - row.at < 45);
  while (s.nextAt - s.distance < 450) spawn(s);
  if (s.mode === "challenge" && s.distance >= 1500 && s.status === "playing") {
    s.distance = 1500;
    s.status = "won";
  }
  s.score = Math.floor(s.distance) + s.coins * 25 + s.near * 15 + s.bonus;
  return s;
}
export function trafficGarage(value) {
  const owned = Array.isArray(value?.owned) ? value.owned : [];
  return {
    bank:
      Number.isSafeInteger(value?.bank) && value.bank >= 0
        ? Math.min(value.bank, 10000000)
        : 0,
    owned: [
      "mint",
      ...TRAFFIC_CARS.filter(
        (c) => c.id !== "mint" && owned.includes(c.id),
      ).map((c) => c.id),
    ],
  };
}
export function buyTrafficCar(input, id) {
  const garage = trafficGarage(input),
    car = TRAFFIC_CARS.find((c) => c.id === id);
  if (!car || garage.owned.includes(id) || garage.bank < car.cost) return null;
  return { bank: garage.bank - car.cost, owned: [...garage.owned, id] };
}
