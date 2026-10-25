export const GOLF = {
  width: 480,
  height: 360,
  radius: 7,
  friction: 1.4,
  maxSpeed: 440,
};
export const GOLF_HOLES = [
  {
    name: "First little putt",
    par: 1,
    start: { x: 90, y: 260 },
    cup: { x: 350, y: 120 },
    walls: [],
  },
  {
    name: "Around the corner",
    par: 3,
    start: { x: 80, y: 270 },
    cup: { x: 390, y: 90 },
    walls: [{ x: 230, y: 100, w: 20, h: 160 }],
  },
  {
    name: "The little island",
    par: 3,
    start: { x: 75, y: 180 },
    cup: { x: 405, y: 180 },
    walls: [{ x: 160, y: 140, w: 150, h: 70 }],
  },
  {
    name: "Find your zigzag",
    par: 4,
    start: { x: 80, y: 290 },
    cup: { x: 400, y: 70 },
    walls: [
      { x: 170, y: 40, w: 20, h: 180 },
      { x: 300, y: 170, w: 20, h: 150 },
    ],
  },
  {
    name: "A quiet stretch",
    par: 2,
    start: { x: 70, y: 170 },
    cup: { x: 410, y: 170 },
    walls: [
      { x: 150, y: 100, w: 230, h: 18 },
      { x: 95, y: 240, w: 250, h: 18 },
    ],
  },
  {
    name: "The home stretch",
    par: 4,
    start: { x: 80, y: 280 },
    cup: { x: 390, y: 270 },
    walls: [
      { x: 200, y: 120, w: 20, h: 190 },
      { x: 200, y: 120, w: 200, h: 20 },
    ],
  },
];
export const WOODLAND_HOLES = [
  {
    name: "Through the pines",
    par: 3,
    start: { x: 70, y: 270 },
    cup: { x: 410, y: 90 },
    walls: [{ x: 220, y: 150, w: 20, h: 150 }],
  },
  {
    name: "Twin bridges",
    par: 5,
    start: { x: 70, y: 180 },
    cup: { x: 410, y: 180 },
    walls: [
      { x: 155, y: 95, w: 20, h: 145 },
      { x: 300, y: 120, w: 20, h: 160 },
    ],
  },
  {
    name: "Stepping stones",
    par: 4,
    start: { x: 80, y: 290 },
    cup: { x: 400, y: 70 },
    walls: [
      { x: 170, y: 200, w: 70, h: 50 },
      { x: 270, y: 110, w: 65, h: 50 },
    ],
  },
  {
    name: "Ribbon alley",
    par: 4,
    start: { x: 70, y: 85 },
    cup: { x: 405, y: 285 },
    walls: [
      { x: 140, y: 130, w: 280, h: 20 },
      { x: 60, y: 235, w: 260, h: 20 },
    ],
  },
  {
    name: "The moon window",
    par: 2,
    start: { x: 80, y: 180 },
    cup: { x: 405, y: 180 },
    walls: [
      { x: 210, y: 40, w: 20, h: 105 },
      { x: 210, y: 215, w: 20, h: 105 },
    ],
  },
  {
    name: "The last lantern",
    par: 4,
    start: { x: 75, y: 285 },
    cup: { x: 390, y: 90 },
    walls: [
      { x: 160, y: 140, w: 20, h: 170 },
      { x: 300, y: 45, w: 20, h: 160 },
    ],
  },
];
export const GOLF_COURSES = {
  meadow: {
    name: "Meadow Six",
    holes: GOLF_HOLES,
    recordKey: "golf",
    saveKey: "golf-save",
  },
  woodland: {
    name: "Woodland Six",
    holes: WOODLAND_HOLES,
    recordKey: "golf-woodland",
    saveKey: "golf-save:woodland",
  },
};
export function golfBall(hole) {
  return { ...hole.start, vx: 0, vy: 0, holed: false };
}
export function aimGolf(ball, cup) {
  const distance = Math.hypot(cup.x - ball.x, cup.y - ball.y);
  return {
    angle:
      ((Math.atan2(cup.y - ball.y, cup.x - ball.x) * 180) / Math.PI + 360) %
      360,
    power: Math.max(
      5,
      Math.min(100, ((distance * GOLF.friction) / GOLF.maxSpeed) * 100 + 5),
    ),
  };
}
export function shootGolf(ball, angle, power) {
  if (ball.holed || Math.hypot(ball.vx, ball.vy) > 0) return ball;
  const radians = (angle * Math.PI) / 180,
    speed = (GOLF.maxSpeed * Math.max(5, Math.min(100, power))) / 100;
  return {
    ...ball,
    vx: Math.cos(radians) * speed,
    vy: Math.sin(radians) * speed,
  };
}
export function circleRect(ball, wall, r = GOLF.radius) {
  const x = Math.max(wall.x, Math.min(wall.x + wall.w, ball.x)),
    y = Math.max(wall.y, Math.min(wall.y + wall.h, ball.y));
  return Math.hypot(ball.x - x, ball.y - y) < r;
}
function collide(ball, wall) {
  const cx = Math.max(wall.x, Math.min(wall.x + wall.w, ball.x)),
    cy = Math.max(wall.y, Math.min(wall.y + wall.h, ball.y)),
    dx = ball.x - cx,
    dy = ball.y - cy,
    distance = Math.hypot(dx, dy);
  if (distance >= GOLF.radius) return;
  let nx, ny;
  if (distance > 0) {
    nx = dx / distance;
    ny = dy / distance;
    ball.x += nx * (GOLF.radius - distance + 0.01);
    ball.y += ny * (GOLF.radius - distance + 0.01);
  } else {
    const sides = [
      {
        d: ball.x - wall.x,
        nx: -1,
        ny: 0,
        x: wall.x - GOLF.radius - 0.01,
        y: ball.y,
      },
      {
        d: wall.x + wall.w - ball.x,
        nx: 1,
        ny: 0,
        x: wall.x + wall.w + GOLF.radius + 0.01,
        y: ball.y,
      },
      {
        d: ball.y - wall.y,
        nx: 0,
        ny: -1,
        x: ball.x,
        y: wall.y - GOLF.radius - 0.01,
      },
      {
        d: wall.y + wall.h - ball.y,
        nx: 0,
        ny: 1,
        x: ball.x,
        y: wall.y + wall.h + GOLF.radius + 0.01,
      },
    ];
    const side = sides.sort((a, b) => a.d - b.d)[0];
    ({ nx, ny } = side);
    ball.x = side.x;
    ball.y = side.y;
  }
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= 1.82 * dot * nx;
    ball.vy -= 1.82 * dot * ny;
  }
}
export function stepGolf(ball, hole, dt) {
  if (ball.holed || (!ball.vx && !ball.vy)) return ball;
  const next = { ...ball },
    elapsed = Math.max(0, Math.min(dt, 1 / 120));
  next.x += next.vx * elapsed;
  next.y += next.vy * elapsed;
  const r = GOLF.radius,
    min = 20 + r,
    maxX = 460 - r,
    maxY = 340 - r;
  if (next.x < min) {
    next.x = min;
    next.vx = Math.abs(next.vx) * 0.82;
  }
  if (next.x > maxX) {
    next.x = maxX;
    next.vx = -Math.abs(next.vx) * 0.82;
  }
  if (next.y < min) {
    next.y = min;
    next.vy = Math.abs(next.vy) * 0.82;
  }
  if (next.y > maxY) {
    next.y = maxY;
    next.vy = -Math.abs(next.vy) * 0.82;
  }
  for (const wall of hole.walls) collide(next, wall);
  const damping = Math.exp(-GOLF.friction * elapsed);
  next.vx *= damping;
  next.vy *= damping;
  if (
    Math.hypot(next.x - hole.cup.x, next.y - hole.cup.y) < 11 &&
    Math.hypot(next.vx, next.vy) < 170
  )
    return { ...next, ...hole.cup, vx: 0, vy: 0, holed: true };
  if (Math.hypot(next.vx, next.vy) < 4) {
    next.vx = 0;
    next.vy = 0;
  }
  return next;
}
export function validGolfSave(s) {
  const course = GOLF_COURSES[s?.courseId ?? "meadow"];
  if (!course) return false;
  if (
    !s ||
    !Number.isInteger(s.index) ||
    s.index < 0 ||
    s.index >= course.holes.length ||
    !Array.isArray(s.scores) ||
    s.scores.length !== s.index ||
    !s.scores.every((n) => Number.isSafeInteger(n) && n > 0) ||
    !Number.isSafeInteger(s.strokes) ||
    s.strokes < 0 ||
    !s.ball ||
    !Number.isFinite(s.ball.x) ||
    !Number.isFinite(s.ball.y)
  )
    return false;
  return (
    s.ball.x >= 27 &&
    s.ball.x <= 453 &&
    s.ball.y >= 27 &&
    s.ball.y <= 333 &&
    !course.holes[s.index].walls.some((w) => circleRect(s.ball, w, 6.9))
  );
}
