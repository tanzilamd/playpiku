export const DASH = {
  width: 600,
  height: 300,
  ground: 246,
  x: 80,
  w: 30,
  h: 36,
  gravity: 1120,
};
export function newDash() {
  return {
    time: 0,
    distance: 0,
    speed: 180,
    y: DASH.ground - DASH.h,
    vy: 0,
    jumps: 0,
    spawnIn: 1.4,
    obstacles: [],
    coins: [],
    collected: 0,
    passed: 0,
    dead: false,
  };
}
export function jumpDash(state) {
  if (state.dead || state.jumps >= 2) return state;
  return {
    ...state,
    vy: state.jumps === 0 ? -435 : -390,
    jumps: state.jumps + 1,
  };
}
export function dashScore(s) {
  return Math.floor(s.distance / 10) + s.collected * 25;
}
export function overlap(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
export function stepDash(state, dt, random = Math.random) {
  if (state.dead) return state;
  const s = {
    ...state,
    obstacles: state.obstacles.map((o) => ({ ...o })),
    coins: state.coins.map((c) => ({ ...c })),
  };
  const elapsed = Math.max(0, Math.min(dt, 0.025));
  s.time += elapsed;
  s.speed = Math.min(350, 180 + s.time * 1.6);
  s.distance += s.speed * elapsed;
  s.vy += DASH.gravity * elapsed;
  s.y += s.vy * elapsed;
  if (s.y >= DASH.ground - DASH.h) {
    s.y = DASH.ground - DASH.h;
    s.vy = 0;
    s.jumps = 0;
  }
  s.spawnIn -= elapsed;
  if (s.spawnIn <= 0) {
    const w = 24 + Math.floor(random() * 17),
      h = 28 + Math.floor(random() * 19);
    s.obstacles.push({ x: DASH.width + 20, w, h, passed: false });
    s.coins.push({
      x: DASH.width + 20 + w / 2,
      y: DASH.ground - h - 43,
      collected: false,
    });
    s.spawnIn = 1.45 + random() * 0.65;
  }
  const runner = { x: DASH.x + 5, y: s.y + 4, w: DASH.w - 10, h: DASH.h - 7 };
  for (const o of s.obstacles) {
    o.x -= s.speed * elapsed;
    if (
      overlap(runner, {
        x: o.x + 3,
        y: DASH.ground - o.h + 3,
        w: o.w - 6,
        h: o.h - 3,
      })
    )
      s.dead = true;
    if (!o.passed && o.x + o.w < DASH.x) {
      o.passed = true;
      s.passed++;
    }
  }
  for (const c of s.coins) {
    c.x -= s.speed * elapsed;
    if (
      !c.collected &&
      overlap(runner, { x: c.x - 9, y: c.y - 9, w: 18, h: 18 })
    ) {
      c.collected = true;
      s.collected++;
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > 0);
  s.coins = s.coins.filter((c) => c.x > -15 && !c.collected);
  return s;
}
