const oval = Array.from({ length: 24 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 12;
  return { x: 320 + 235 * Math.cos(a), y: 240 + 150 * Math.sin(a) };
});
export const RALLY_TRACKS = {
  meadow: { name: "Meadow Loop", color: "#244d3c", width: 82, points: oval },
  sunset: {
    name: "Sunset Bend",
    color: "#534539",
    width: 86,
    points: [
      [320, 80],
      [450, 90],
      [550, 155],
      [555, 260],
      [495, 355],
      [380, 395],
      [285, 350],
      [225, 275],
      [135, 300],
      [75, 240],
      [85, 145],
      [180, 85],
    ].map(([x, y]) => ({ x, y })),
  },
  harbor: {
    name: "Harbor Sprint",
    color: "#294b51",
    width: 80,
    points: [
      [300, 85],
      [470, 85],
      [550, 150],
      [550, 290],
      [470, 365],
      [335, 390],
      [245, 335],
      [160, 365],
      [80, 290],
      [80, 150],
      [155, 85],
    ].map(([x, y]) => ({ x, y })),
  },
};
export function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
export function nearestRoad(track, x, y) {
  let best = { distance: Infinity, x: 0, y: 0, segment: 0 };
  track.points.forEach((a, i) => {
    const b = track.points[(i + 1) % track.points.length],
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)),
      ),
      px = a.x + t * dx,
      py = a.y + t * dy,
      d = Math.hypot(x - px, y - py);
    if (d < best.distance) best = { distance: d, x: px, y: py, segment: i };
  });
  return best;
}
export function newRally(trackId = "meadow", mode = "practice") {
  const id = Object.hasOwn(RALLY_TRACKS, trackId) ? trackId : "meadow",
    track = RALLY_TRACKS[id],
    a = track.points[0],
    b = track.points[1];
  return {
    trackId: id,
    mode: ["practice", "relaxed", "classic"].includes(mode) ? mode : "practice",
    x: a.x,
    y: a.y,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    vx: 0,
    vy: 0,
    speed: 0,
    steering: 0,
    nextCheckpoint: 1,
    laps: 0,
    time: 0,
    penalty: 0,
    offroad: false,
    finished: false,
  };
}
export function resetRally(s) {
  if (s.finished) return s;
  const track = RALLY_TRACKS[s.trackId],
    last = (s.nextCheckpoint - 1 + track.points.length) % track.points.length,
    a = track.points[last],
    b = track.points[s.nextCheckpoint];
  return {
    ...s,
    x: a.x,
    y: a.y,
    vx: 0,
    vy: 0,
    speed: 0,
    steering: 0,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    offroad: false,
    penalty: s.penalty + (s.mode === "practice" ? 0 : 3),
  };
}
export function stepRally(state, input, dt) {
  if (state.finished) return state;
  const s = { ...state },
    elapsed = Math.max(0, Math.min(dt, 1 / 120)),
    track = RALLY_TRACKS[s.trackId],
    classic = s.mode === "classic",
    road = nearestRoad(track, s.x, s.y);
  s.time += elapsed;
  s.offroad = road.distance > track.width / 2 - 8;
  const desiredSteer = Math.max(-1, Math.min(1, input.steer || 0));
  s.steering += (desiredSteer - s.steering) * Math.min(1, elapsed * 10);
  const max = classic ? 225 : 185,
    target = s.offroad ? 68 : input.brake ? 95 : max;
  s.speed +=
    (target - s.speed) * Math.min(1, elapsed * (input.brake ? 4 : 1.8));
  s.angle = wrapAngle(
    s.angle +
      s.steering *
        (classic ? 2.45 : 2.25) *
        elapsed *
        (0.45 + (0.65 * s.speed) / max),
  );
  const grip = input.brake && Math.abs(s.steering) > 0.3 ? 3 : 7;
  s.vx += (Math.cos(s.angle) * s.speed - s.vx) * Math.min(1, grip * elapsed);
  s.vy += (Math.sin(s.angle) * s.speed - s.vy) * Math.min(1, grip * elapsed);
  s.x += s.vx * elapsed;
  s.y += s.vy * elapsed;
  if (s.x < 14 || s.x > 626) {
    s.x = Math.max(14, Math.min(626, s.x));
    s.vx *= -0.25;
    s.speed *= 0.6;
  }
  if (s.y < 14 || s.y > 466) {
    s.y = Math.max(14, Math.min(466, s.y));
    s.vy *= -0.25;
    s.speed *= 0.6;
  }
  const checkpoint = track.points[s.nextCheckpoint],
    previous =
      track.points[
        (s.nextCheckpoint - 1 + track.points.length) % track.points.length
      ],
    forward =
      s.vx * (checkpoint.x - previous.x) + s.vy * (checkpoint.y - previous.y) >
      0;
  if (Math.hypot(s.x - checkpoint.x, s.y - checkpoint.y) < 33 && forward) {
    if (s.nextCheckpoint === 0) {
      s.laps++;
      if (s.mode !== "practice" && s.laps >= 3) s.finished = true;
    }
    s.nextCheckpoint = (s.nextCheckpoint + 1) % track.points.length;
  }
  return s;
}
