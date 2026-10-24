export const BLOCK_SIZE = 8;
export const SHAPES = [
  [[0, 0]],
  [
    [0, 0],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
];
export function fitsBlock(board, shape, x, y) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    shape.every(([dx, dy]) => {
      const nx = x + dx,
        ny = y + dy;
      return (
        nx >= 0 &&
        ny >= 0 &&
        nx < BLOCK_SIZE &&
        ny < BLOCK_SIZE &&
        !board[ny * BLOCK_SIZE + nx]
      );
    })
  );
}
export function canPlaceBlock(board, shape) {
  for (let y = 0; y < BLOCK_SIZE; y++)
    for (let x = 0; x < BLOCK_SIZE; x++)
      if (fitsBlock(board, shape, x, y)) return true;
  return false;
}
export function placeBlock(board, shape, x, y, combo = 0) {
  if (!fitsBlock(board, shape, x, y)) return null;
  const next = [...board];
  for (const [dx, dy] of shape) next[(y + dy) * BLOCK_SIZE + x + dx] = 1;
  const rows = [],
    columns = [];
  for (let i = 0; i < BLOCK_SIZE; i++) {
    if (
      Array.from(
        { length: BLOCK_SIZE },
        (_, x) => next[i * BLOCK_SIZE + x],
      ).every(Boolean)
    )
      rows.push(i);
    if (
      Array.from(
        { length: BLOCK_SIZE },
        (_, y) => next[y * BLOCK_SIZE + i],
      ).every(Boolean)
    )
      columns.push(i);
  }
  const cleared = [];
  for (let i = 0; i < next.length; i++)
    if (
      rows.includes(Math.floor(i / BLOCK_SIZE)) ||
      columns.includes(i % BLOCK_SIZE)
    ) {
      next[i] = 0;
      cleared.push(i);
    }
  const lines = rows.length + columns.length,
    nextCombo = lines ? Math.min(combo + 1, 5) : 0;
  return {
    board: next,
    lines,
    cleared,
    combo: nextCombo,
    points: shape.length + lines * 80 * nextCombo,
  };
}
export function makeTray(board, random = Math.random) {
  const pool = SHAPES.map((_, i) => i),
    fitting = pool.filter((i) => canPlaceBlock(board, SHAPES[i]));
  if (!fitting.length) return [];
  const pick = (a) =>
    a[Math.min(a.length - 1, Math.floor(random() * a.length))];
  const tray = [pick(fitting), pick(pool.slice(1)), pick(pool.slice(1))];
  // The playable piece is not always in the same slot.
  const swap = Math.floor(random() * 3);
  [tray[0], tray[swap]] = [tray[swap], tray[0]];
  return tray;
}
export function hasBlockMove(board, tray) {
  return tray.some((id) => id !== null && canPlaceBlock(board, SHAPES[id]));
}
export function validBlockSave(value) {
  return (
    !!value &&
    Array.isArray(value.board) &&
    value.board.length === 64 &&
    value.board.every((n) => n === 0 || n === 1) &&
    Array.isArray(value.tray) &&
    value.tray.length === 3 &&
    value.tray.every(
      (n) => n === null || (Number.isInteger(n) && n >= 0 && n < SHAPES.length),
    ) &&
    Number.isSafeInteger(value.score) &&
    value.score >= 0 &&
    Number.isInteger(value.combo) &&
    value.combo >= 0 &&
    value.combo <= 5
  );
}
