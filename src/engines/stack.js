export const STACK_MODES = {
  relaxed: { label: "Relaxed", speed: 85, maxSpeed: 170, perfect: 12 },
  classic: { label: "Classic", speed: 110, maxSpeed: 250, perfect: 8 },
};
export function newStack(mode = "relaxed") {
  return {
    mode: Object.hasOwn(STACK_MODES, mode) ? mode : "relaxed",
    height: 0,
    combo: 0,
    blocks: [{ x: 110, w: 180 }],
    moving: { x: 0, w: 180, dir: 1 },
    dead: false,
  };
}
export function stepStack(state, dt) {
  if (state.dead) return state;
  const mode = STACK_MODES[state.mode],
    speed = Math.min(mode.maxSpeed, mode.speed + state.height * 6),
    moving = { ...state.moving },
    limit = 400 - moving.w;
  moving.x += moving.dir * speed * Math.max(0, Math.min(dt, 0.04));
  if (moving.x > limit) {
    moving.x = 2 * limit - moving.x;
    moving.dir = -1;
  }
  if (moving.x < 0) {
    moving.x = -moving.x;
    moving.dir = 1;
  }
  return { ...state, moving };
}
export function dropStack(state) {
  if (state.dead) return { state, perfect: false, cuts: [] };
  const previous = state.blocks.at(-1),
    moving = state.moving,
    left = Math.max(previous.x, moving.x),
    right = Math.min(previous.x + previous.w, moving.x + moving.w);
  if (right <= left)
    return { state: { ...state, dead: true }, perfect: false, cuts: [] };
  const perfect =
    Math.abs(previous.x - moving.x) <= STACK_MODES[state.mode].perfect;
  let w = right - left,
    x = left;
  const cuts = [];
  if (perfect) {
    w = Math.min(180, previous.w + 6);
    x = Math.max(0, Math.min(400 - w, previous.x + (previous.w - w) / 2));
  } else {
    if (moving.x < left) cuts.push({ x: moving.x, w: left - moving.x });
    if (moving.x + moving.w > right)
      cuts.push({ x: right, w: moving.x + moving.w - right });
  }
  const height = state.height + 1,
    dir = height % 2 ? -1 : 1;
  return {
    state: {
      ...state,
      height,
      combo: perfect ? state.combo + 1 : 0,
      blocks: [...state.blocks, { x, w }],
      moving: { x: dir === 1 ? 0 : 400 - w, w, dir },
    },
    perfect,
    cuts,
  };
}
