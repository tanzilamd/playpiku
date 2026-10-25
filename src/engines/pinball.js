export const PINBALL_BUMPERS = [
  { x: 130, y: 178, r: 25 },
  { x: 270, y: 178, r: 25 },
  { x: 200, y: 252, r: 28 },
];
export const PINBALL_TARGETS = [
  { x: 105, y: 86 },
  { x: 200, y: 72 },
  { x: 295, y: 86 },
];
export function newPinball() {
  return {
    ball: { x: 365, y: 500, vx: 0, vy: 0 },
    balls: 3,
    score: 0,
    multiplier: 1,
    targets: [false, false, false],
    launched: false,
    over: false,
    time: 0,
    save: 0,
    nudges: 3,
    nudgeCooldown: 0,
    flippers: [0, 0],
    flash: [0, 0, 0],
    targetFlash: 0,
    bumps: 0,
    saves: 0,
    ballId: 1,
  };
}
export function launchPinball(s) {
  if (s.over || s.launched) return false;
  s.ball = { x: 365, y: 500, vx: -48, vy: -870, lane: true };
  s.launched = true;
  s.save = 4;
  return true;
}
export function nudgePinball(s) {
  if (!s.launched || s.over || s.nudges <= 0 || s.nudgeCooldown > 0)
    return false;
  s.nudges--;
  s.nudgeCooldown = 0.8;
  s.ball.vy = Math.min(s.ball.vy, -235);
  s.ball.vx += s.ball.x < 200 ? 90 : -90;
  return true;
}
export function flipperSegment(side, amount) {
  const angle =
    side === 0 ? 0.43 - amount * 0.95 : Math.PI - 0.43 + amount * 0.95;
  const x = side === 0 ? 112 : 288,
    y = 496;
  return {
    ax: x,
    ay: y,
    bx: x + Math.cos(angle) * 69,
    by: y + Math.sin(angle) * 69,
  };
}
function segment(ball, ax, ay, bx, by, radius, restitution = 0.8) {
  const dx = bx - ax,
    dy = by - ay,
    t = Math.max(
      0,
      Math.min(
        1,
        ((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy),
      ),
    ),
    px = ax + dx * t,
    py = ay + dy * t;
  let nx = ball.x - px,
    ny = ball.y - py,
    d = Math.hypot(nx, ny);
  if (d >= radius) return null;
  if (d < 0.001) {
    nx = -dy;
    ny = dx;
    d = Math.hypot(nx, ny) || 1;
  }
  nx /= d;
  ny /= d;
  const push = radius - Math.hypot(ball.x - px, ball.y - py);
  ball.x += nx * push;
  ball.y += ny * push;
  const speed = ball.vx * nx + ball.vy * ny;
  if (speed < 0) {
    ball.vx -= (1 + restitution) * speed * nx;
    ball.vy -= (1 + restitution) * speed * ny;
  }
  return { nx, ny, t, speed };
}
export function stepPinball(s, dt, input = {}) {
  if (s.over || dt <= 0 || !Number.isFinite(dt)) return [];
  const events = [];
  const steps = Math.ceil(Math.min(dt, 0.05) / (1 / 240)),
    h = Math.min(dt, 0.05) / steps;
  for (let n = 0; n < steps; n++) {
    s.time += h;
    s.nudgeCooldown = Math.max(0, s.nudgeCooldown - h);
    s.save = Math.max(0, s.save - h);
    s.targetFlash = Math.max(0, s.targetFlash - h);
    s.flash = s.flash.map((f) => Math.max(0, f - h));
    for (let i = 0; i < 2; i++)
      s.flippers[i] +=
        Math.max(
          -1,
          Math.min(
            1,
            ((i === 0 ? input.left : input.right) ? 1 : 0) - s.flippers[i],
          ),
        ) * Math.min(1, h * 22);
    if (!s.launched) continue;
    const b = s.ball;
    b.vy += 445 * h;
    b.vx *= 1 - h * 0.09;
    b.vy *= 1 - h * 0.035;
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.x < 29) {
      b.x = 29;
      b.vx = Math.abs(b.vx) * 0.88;
    }
    if (b.x > 371) {
      b.x = 371;
      b.vx = -Math.abs(b.vx) * 0.88;
    }
    if (b.y < 35) {
      b.y = 35;
      b.vy = Math.abs(b.vy) * 0.85;
    }
    // The launch lane opens into the upper arch. Its divider catches the returning ball.
    if (b.y > 125 && b.x > 343 && b.x < 350) {
      b.x = 350;
      b.vx = Math.abs(b.vx);
    }
    if (b.y < 122 && b.lane) {
      b.lane = false;
      b.vx = -300;
    }
    for (let i = 0; i < PINBALL_BUMPERS.length; i++) {
      const p = PINBALL_BUMPERS[i],
        dx = b.x - p.x,
        dy = b.y - p.y,
        d = Math.hypot(dx, dy),
        r = p.r + 8;
      if (d < r) {
        const nx = dx / (d || 1),
          ny = dy / (d || 1);
        b.x = p.x + nx * (r + 0.2);
        b.y = p.y + ny * (r + 0.2);
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 2 * Math.min(0, dot) * nx;
        b.vy -= 2 * Math.min(0, dot) * ny;
        b.vx += nx * 155;
        b.vy += ny * 155;
        if (s.flash[i] === 0) {
          s.score += 100 * s.multiplier;
          s.bumps++;
          events.push("bumper");
        }
        s.flash[i] = 0.16;
      }
    }
    for (let i = 0; i < PINBALL_TARGETS.length; i++) {
      const p = PINBALL_TARGETS[i],
        dx = b.x - p.x,
        dy = b.y - p.y,
        d = Math.hypot(dx, dy);
      if (d < 22) {
        const nx = dx / (d || 1),
          ny = dy / (d || 1);
        b.x = p.x + nx * 22;
        b.y = p.y + ny * 22;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 1.8 * dot * nx;
          b.vy -= 1.8 * dot * ny;
        }
        if (!s.targets[i]) {
          s.targets[i] = true;
          s.score += 250 * s.multiplier;
          events.push("target");
          if (s.targets.every(Boolean)) {
            s.multiplier = Math.min(5, s.multiplier + 1);
            s.score += 500;
            s.targetFlash = 1;
            s.targets.fill(false);
            events.push("multiplier");
          }
        }
      }
    }
    segment(b, 30, 350, 95, 438, 13, 1.05);
    segment(b, 327, 350, 305, 438, 13, 1.05);
    segment(b, 38, 419, 108, 490, 12, 0.85);
    segment(b, 338, 419, 292, 490, 12, 0.85);
    for (let i = 0; i < 2; i++) {
      const f = flipperSegment(i, s.flippers[i]),
        hit = segment(b, f.ax, f.ay, f.bx, f.by, 17, 0.88);
      if (hit && hit.ny < 0.3 && (i === 0 ? input.left : input.right)) {
        b.vy = Math.min(b.vy, -510 - 100 * hit.t);
        b.vx += (i === 0 ? 1 : -1) * (65 + 115 * hit.t);
      }
    }
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 1000) {
      b.vx *= 1000 / speed;
      b.vy *= 1000 / speed;
    }
    if (b.y > 591) {
      if (s.save > 0) {
        b.x = 200;
        b.y = 390;
        b.vx = 30;
        b.vy = -530;
        s.saves++;
        events.push("save");
        s.save = 0;
      } else {
        s.balls--;
        s.launched = false;
        s.ballId++;
        s.nudges = 3;
        s.multiplier = 1;
        s.targets.fill(false);
        s.ball = { x: 365, y: 500, vx: 0, vy: 0 };
        s.over = s.balls === 0;
        events.push(s.over ? "over" : "drain");
      }
      break;
    }
  }
  return events;
}
