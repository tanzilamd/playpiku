export const BUBBLE_RADIUS = 18;
export const BUBBLE_LEVELS = 12;
export const BUBBLE_COLORS = [
  "#f1a58e",
  "#a8d88b",
  "#9ecfee",
  "#d0afea",
  "#f3d483",
];
export const bubbleCenter = (row, col) => ({
  x: 38 + col * 36 + (row % 2) * 18,
  y: 46 + row * Math.sqrt(3) * 18,
});
const valid = (r, c) => r >= 0 && r <= 12 && c >= 0 && c < (r % 2 ? 9 : 10);
const key = (b) => `${b.row}:${b.col}`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function bubbleNeighbors(b, board) {
  const p = bubbleCenter(b.row, b.col);
  return board.filter(
    (v) =>
      !(v.row === b.row && v.col === b.col) &&
      distance(p, bubbleCenter(v.row, v.col)) < 36.2,
  );
}
export function bubbleAmmo(board, random = Math.random) {
  const exposed = board.filter(
    (b) => !bubbleNeighbors(b, board).some((n) => n.row > b.row),
  );
  const colors = [
    ...new Set((exposed.length ? exposed : board).map((b) => b.color)),
  ];
  return colors.length
    ? colors[Math.min(colors.length - 1, Math.floor(random() * colors.length))]
    : 0;
}
export function newBubble(level = 1, random = Math.random) {
  level = Math.min(BUBBLE_LEVELS, Math.max(1, Math.floor(level) || 1));
  const rows = 4 + Math.floor((level - 1) / 3),
    colors = Math.min(5, 3 + Math.floor((level - 1) / 5));
  const board = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < (row % 2 ? 9 : 10); col++) {
      board.push({
        row,
        col,
        color: (Math.floor(col / 3) + Math.floor(row / 2) + level) % colors,
      });
    }
  return {
    level,
    board,
    shots: Math.ceil(board.length * 0.7) + 8,
    score: 0,
    combo: 0,
    current: bubbleAmmo(board, random),
    next: bubbleAmmo(board, random),
    status: "playing",
  };
}
// Use the same small steps for the guide and the actual shot, including wall bounces.
export function traceBubble(board, angle) {
  angle = Math.max(-1.35, Math.min(1.35, Number(angle) || 0));
  let x = 200,
    y = 524,
    dx = Math.sin(angle),
    dy = -Math.cos(angle);
  const path = [{ x, y }];
  let hit = null;
  for (let step = 0; step < 1500; step++) {
    x += dx * 2.5;
    y += dy * 2.5;
    if (x < 38 || x > 362) {
      x = x < 38 ? 76 - x : 724 - x;
      dx *= -1;
      path.push({ x, y });
    }
    hit =
      board.find(
        (b) => distance({ x, y }, bubbleCenter(b.row, b.col)) <= 35.8,
      ) || null;
    if (hit || y <= 46) break;
  }
  path.push({ x, y });
  const occupied = new Set(board.map(key)),
    candidates = [];
  for (let row = 0; row <= 12; row++)
    for (let col = 0; col < (row % 2 ? 9 : 10); col++) {
      if (occupied.has(`${row}:${col}`)) continue;
      const p = bubbleCenter(row, col);
      if (hit ? distance(p, bubbleCenter(hit.row, hit.col)) < 36.2 : row === 0)
        candidates.push({ row, col, ...p });
    }
  candidates.sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }));
  return { path, cell: candidates[0] || null };
}
export function settleBubble(state, cell, random = Math.random) {
  if (
    state.status !== "playing" ||
    !cell ||
    !valid(cell.row, cell.col) ||
    !Number.isInteger(cell.row) ||
    !Number.isInteger(cell.col) ||
    state.board.some((b) => key(b) === key(cell))
  )
    return { state, popped: [], dropped: [] };
  const placed = { row: cell.row, col: cell.col, color: state.current };
  let board = [...state.board.map((b) => ({ ...b })), placed];
  const group = new Set([placed]),
    queue = [placed];
  while (queue.length)
    for (const b of bubbleNeighbors(queue.shift(), board))
      if (b.color === placed.color && !group.has(b)) {
        group.add(b);
        queue.push(b);
      }
  const popped = group.size >= 3 ? [...group] : [];
  board = board.filter((b) => !popped.includes(b));
  const anchored = new Set(board.filter((b) => b.row === 0)),
    flood = [...anchored];
  while (flood.length)
    for (const b of bubbleNeighbors(flood.shift(), board))
      if (!anchored.has(b)) {
        anchored.add(b);
        flood.push(b);
      }
  const dropped = board.filter((b) => !anchored.has(b));
  board = board.filter((b) => anchored.has(b));
  const combo = popped.length ? state.combo + 1 : 0;
  const next = {
    ...state,
    board,
    shots: state.shots - 1,
    combo,
    score:
      state.score +
      popped.length * 20 +
      dropped.length * 40 +
      (combo > 1 ? combo * 10 : 0),
    current: state.next,
    next: bubbleAmmo(board, random),
  };
  if (!board.some((b) => b.color === next.current))
    next.current = bubbleAmmo(board, random);
  next.status = !board.length
    ? "won"
    : next.shots <= 0 || board.some((b) => b.row >= 12)
      ? "lost"
      : "playing";
  return { state: next, popped, dropped };
}
export function shootBubble(state, angle, random = Math.random) {
  return settleBubble(state, traceBubble(state.board, angle).cell, random);
}
export function restoreBubble(value) {
  if (
    !value ||
    !Number.isInteger(value.level) ||
    value.level < 1 ||
    value.level > BUBBLE_LEVELS ||
    !Array.isArray(value.board) ||
    !value.board.length ||
    value.board.length > 124 ||
    value.status !== "playing" ||
    !Number.isInteger(value.shots) ||
    value.shots < 1 ||
    value.shots > 100 ||
    !Number.isFinite(value.score) ||
    value.score < 0 ||
    !Number.isInteger(value.combo) ||
    value.combo < 0 ||
    ![value.current, value.next].every(
      (c) => Number.isInteger(c) && c >= 0 && c < 5,
    )
  )
    return null;
  const cells = new Set();
  for (const b of value.board) {
    if (
      !b ||
      !valid(b.row, b.col) ||
      b.row >= 12 ||
      !Number.isInteger(b.row) ||
      !Number.isInteger(b.col) ||
      !Number.isInteger(b.color) ||
      b.color < 0 ||
      b.color > 4 ||
      cells.has(key(b))
    )
      return null;
    cells.add(key(b));
  }
  const reached = new Set(value.board.filter((b) => b.row === 0)),
    pending = [...reached];
  while (pending.length)
    for (const b of bubbleNeighbors(pending.shift(), value.board))
      if (!reached.has(b)) {
        reached.add(b);
        pending.push(b);
      }
  if (reached.size !== value.board.length) return null;
  return structuredClone(value);
}
