export const MINE_LEVELS = {
  easy: { size: 8, mines: 10, label: "Easy · 8 × 8" },
  normal: { size: 10, mines: 16, label: "Classic · 10 × 10" },
  hard: { size: 12, mines: 28, label: "Expert · 12 × 12" },
};
export function neighbors(index, size) {
  const x = index % size,
    y = Math.floor(index / size),
    result = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (dx || dy) {
        const nx = x + dx,
          ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size)
          result.push(ny * size + nx);
      }
  return result;
}
export function createMinefield(size, count, first, random = Math.random) {
  const safe = new Set([first, ...neighbors(first, size)]),
    candidates = Array.from({ length: size * size }, (_, i) => i).filter(
      (i) => !safe.has(i),
    );
  if (count > candidates.length)
    throw new RangeError("Too many mines for a safe opening");
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const cells = Array.from({ length: size * size }, () => ({
    mine: false,
    number: 0,
    revealed: false,
    flagged: false,
  }));
  for (const i of candidates.slice(0, count)) cells[i].mine = true;
  cells.forEach(
    (c, i) =>
      (c.number = neighbors(i, size).filter((n) => cells[n].mine).length),
  );
  return cells;
}
export function revealMines(cells, size, indices) {
  const next = cells.map((c) => ({ ...c })),
    queue = [...indices];
  let exploded = null;
  for (let pos = 0; pos < queue.length; pos++) {
    const i = queue[pos],
      c = next[i];
    if (!c || c.revealed || c.flagged) continue;
    c.revealed = true;
    if (c.mine) {
      exploded = i;
      break;
    }
    if (c.number === 0)
      for (const n of neighbors(i, size))
        if (!next[n].revealed && !next[n].flagged) queue.push(n);
  }
  return {
    cells: next,
    exploded,
    won: exploded === null && next.every((c) => c.mine || c.revealed),
  };
}
export function chordTargets(cells, size, index) {
  const c = cells[index];
  if (!c?.revealed || !c.number || c.mine) return [];
  const around = neighbors(index, size);
  return around.filter((i) => cells[i].flagged).length === c.number
    ? around.filter((i) => !cells[i].flagged && !cells[i].revealed)
    : [];
}
