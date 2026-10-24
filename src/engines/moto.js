export const MOTO_TRACKS = Array.from({ length: 12 }, (_, i) => ({
  id: `trail-${i + 1}`,
  name: [
    "Meadow Roll",
    "Little Bridges",
    "Green Ribbon",
    "Countryside Loop",
    "Dune Whisper",
    "Amber Run",
    "Sandy Switchback",
    "Desert Ribbon",
    "Pine Rise",
    "Blue Ridge",
    "Cloud Path",
    "Summit Stretch",
  ][i],
  region: ["Countryside", "Desert", "Mountain"][Math.floor(i / 4)],
  length: 2100 + (i % 4) * 260 + Math.floor(i / 4) * 180,
  amplitude: 20 + i * 2.5,
  wavelength: 420 + (i % 3) * 45,
  par: (2100 + (i % 4) * 260 + Math.floor(i / 4) * 180) / 210 + 1.2,
  sky: ["#9bc2c0", "#d9ba93", "#a8b9ce"][Math.floor(i / 4)],
  soil: ["#577b53", "#ad8150", "#62796b"][Math.floor(i / 4)],
}));
export function motoGround(track, x) {
  // Flat start, smooth hills, no invisible gaps or sharp collision seams.
  const blend = Math.max(0, Math.min(1, (x - 120) / 200));
  const smooth = blend * blend * (3 - 2 * blend);
  let ramps = 0;
  for (let peak = 620; peak < track.length - 150; peak += 620)
    ramps +=
      (24 + track.amplitude * 0.15) * Math.exp(-(((x - peak) / 55) ** 2));
  return (
    100 +
    smooth *
      (ramps +
        track.amplitude *
          Math.sin(((x - 120) * Math.PI * 2) / track.wavelength) +
        track.amplitude *
          0.22 *
          Math.sin(((x - 120) * Math.PI * 2) / (track.wavelength * 0.53)))
  );
}
export function motoSlope(track, x) {
  return Math.atan2(motoGround(track, x + 1) - motoGround(track, x - 1), 2);
}
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function newMoto(id = "trail-1") {
  const track = MOTO_TRACKS.find((t) => t.id === id) || MOTO_TRACKS[0];
  return {
    track: track.id,
    x: 40,
    y: motoGround(track, 40) + 24,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    grounded: true,
    time: 0,
    penalty: 0,
    checkpoint: 40,
    deaths: 0,
    airtime: 0,
    landings: 0,
    score: 0,
    status: "playing",
  };
}
export function stepMoto(input, dt, controls = {}) {
  if (input.status !== "playing" || !Number.isFinite(dt) || dt <= 0)
    return input;
  dt = Math.min(dt, 1 / 60);
  const s = { ...input },
    track = MOTO_TRACKS.find((t) => t.id === s.track),
    slope = motoSlope(track, s.x);
  const lean = clamp(Number(controls.lean) || 0, -1, 1);
  const drive = controls.gas && !controls.brake;
  s.time += dt;
  if (s.grounded) {
    s.vx = clamp(
      s.vx +
        ((drive ? 125 : -14) -
          (controls.brake ? 240 : 0) -
          Math.sin(slope) * 80) *
          dt,
      0,
      220,
    );
    s.omega +=
      (angleDifference(slope + lean * 0.45, s.angle) * 22 - s.omega * 9) * dt;
    s.angle += s.omega * dt;
    const nextX = s.x + s.vx * dt,
      support = motoGround(track, nextX) + 24;
    const predicted = s.y + s.vy * dt - (340 * dt * dt) / 2;
    s.x = nextX;
    const curvature =
      (motoGround(track, s.x + 2) -
        2 * motoGround(track, s.x) +
        motoGround(track, s.x - 2)) /
      4;
    if (s.vx > 100 && curvature * s.vx * s.vx < -340) {
      s.grounded = false;
      s.y = Math.max(support, predicted);
      s.vy -= 340 * dt;
      s.airtime = dt;
    } else {
      s.y = support;
      s.vy = Math.tan(motoSlope(track, s.x)) * s.vx;
    }
  } else {
    s.x += s.vx * dt;
    s.vy -= 340 * dt;
    s.y += s.vy * dt;
    // Gentle balance assistance; deliberate leaning still controls the bike.
    const target = motoSlope(track, s.x + s.vx * 0.14);
    s.omega +=
      (lean * 8 + angleDifference(target, s.angle) * 5 - s.omega * 2.8) * dt;
    s.angle += s.omega * dt;
    s.airtime += dt;
    const support = motoGround(track, s.x) + 24;
    if (s.y <= support) {
      if (Math.abs(angleDifference(s.angle, motoSlope(track, s.x))) > 1.04)
        s.status = "crashed";
      else {
        if (
          s.airtime > 0.18 &&
          Math.abs(angleDifference(s.angle, motoSlope(track, s.x))) < 0.3
        ) {
          s.landings++;
          s.score += 100;
        }
        s.grounded = true;
        s.y = support;
        s.vy = Math.tan(motoSlope(track, s.x)) * s.vx;
        s.airtime = 0;
      }
    }
  }
  s.angle = angleDifference(s.angle, 0);
  if (
    s.status === "playing" &&
    s.x >= 400 &&
    Math.floor(s.x / 400) * 400 > s.checkpoint
  )
    s.checkpoint = Math.floor(s.x / 400) * 400;
  if (s.x >= track.length && s.status === "playing") {
    s.x = track.length;
    s.status = "won";
  }
  return s;
}
export function resetMoto(input) {
  if (input.status === "won") return input;
  const track = MOTO_TRACKS.find((t) => t.id === input.track);
  return {
    ...input,
    x: input.checkpoint,
    y: motoGround(track, input.checkpoint) + 24,
    vx: 0,
    vy: 0,
    angle: motoSlope(track, input.checkpoint),
    omega: 0,
    grounded: true,
    airtime: 0,
    status: "playing",
    penalty: input.penalty + 3,
    deaths: input.deaths + 1,
  };
}
export function motoMedal(s) {
  if (s.status !== "won") return "";
  const par = MOTO_TRACKS.find((t) => t.id === s.track).par,
    time = s.time + s.penalty;
  return time <= par ? "Gold" : time <= par * 1.3 ? "Silver" : "Bronze";
}
export function validMotoGhost(value, trackId) {
  const track = MOTO_TRACKS.find((t) => t.id === trackId);
  if (
    !track ||
    value?.version !== 1 ||
    value.track !== trackId ||
    !Array.isArray(value.frames) ||
    value.frames.length < 2 ||
    value.frames.length > 5000
  )
    return null;
  let previous = -1;
  for (const f of value.frames) {
    if (
      !Array.isArray(f) ||
      f.length !== 4 ||
      !f.every(Number.isFinite) ||
      f[0] < 0 ||
      f[0] <= previous ||
      f[0] > 3600 ||
      f[1] < 0 ||
      f[1] > track.length + 1 ||
      Math.abs(f[2]) > 3000 ||
      Math.abs(f[3]) > Math.PI + 0.01
    )
      return null;
    previous = f[0];
  }
  return value;
}
export function motoGhostAt(ghost, time) {
  if (!ghost || time > ghost.frames.at(-1)[0]) return null;
  let low = 0,
    high = ghost.frames.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (ghost.frames[mid][0] < time) low = mid + 1;
    else high = mid;
  }
  const b = ghost.frames[low],
    a = ghost.frames[Math.max(0, low - 1)],
    t = b[0] === a[0] ? 0 : clamp((time - a[0]) / (b[0] - a[0]), 0, 1);
  return {
    x: a[1] + (b[1] - a[1]) * t,
    y: a[2] + (b[2] - a[2]) * t,
    angle: a[3] + angleDifference(b[3], a[3]) * t,
  };
}
