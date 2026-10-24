export const CROPS = [
  { name: "Strawberry", color: "#f18f91", shape: "berry" },
  { name: "Carrot", color: "#ffc17f", shape: "carrot" },
  { name: "Blueberry", color: "#aaa9ef", shape: "berry" },
  { name: "Pear", color: "#cce794", shape: "pear" },
  { name: "Sunflower", color: "#ffdf83", shape: "flower" },
];
export const HARVEST_LEVELS = Array.from({ length: 24 }, (_, i) => {
  const region = Math.floor(i / 6);
  const types = [i % 5, (i + 2) % 5, (i + 3) % 5].slice(
    0,
    i < 3 ? 1 : i < 12 ? 2 : 3,
  );
  return {
    id: i + 1,
    name: [
      "Berry Meadow",
      "Golden Orchard",
      "Moonlit Garden",
      "Sunflower Valley",
    ][region],
    moves: 22 + region * 4,
    targets: Array.from({ length: 5 }, (_, t) =>
      types.includes(t) ? 10 + region * 3 + (i % 3) : 0,
    ),
    patches: i < 6 ? 0 : 5 + region * 2,
    layers: i < 18 ? 1 : 2,
  };
});
const clone = (s) => ({
  ...s,
  board: s.board.map((c) => ({ ...c })),
  grass: [...s.grass],
  collected: [...s.collected],
});
function random(s, n) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return Math.floor((s.seed / 4294967296) * n);
}
export function harvestMatches(board) {
  const groups = [];
  for (let axis = 0; axis < 2; axis++)
    for (let line = 0; line < 7; line++) {
      let run = [];
      for (let j = 0; j <= 7; j++) {
        const at = axis ? j * 7 + line : line * 7 + j;
        if (j < 7 && (!run.length || board[at]?.type === board[run[0]]?.type))
          run.push(at);
        else {
          if (run.length >= 3) groups.push(run);
          run = j < 7 ? [at] : [];
        }
      }
    }
  return groups;
}
function adjacent(a, b) {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    a < 49 &&
    b < 49 &&
    Math.abs((a % 7) - (b % 7)) +
      Math.abs(Math.floor(a / 7) - Math.floor(b / 7)) ===
      1
  );
}
function swap(board, a, b) {
  [board[a], board[b]] = [board[b], board[a]];
}
function firstMove(s) {
  for (let a = 0; a < 49; a++)
    for (const b of [a % 7 < 6 ? a + 1 : -1, a + 7 < 49 ? a + 7 : -1]) {
      if (!adjacent(a, b)) continue;
      if (s.board[a].special === "color" || s.board[b].special === "color")
        return [a, b];
      const board = s.board.slice();
      swap(board, a, b);
      if (harvestMatches(board).length) return [a, b];
    }
  return null;
}
export function harvestHint(s) {
  const targets = HARVEST_LEVELS[s.level - 1].targets;
  let best = null,
    bestScore = -Infinity;
  for (let a = 0; a < 49; a++)
    for (const b of [a % 7 < 6 ? a + 1 : -1, a + 7]) {
      if (!adjacent(a, b)) continue;
      const board = s.board.slice();
      swap(board, a, b);
      const color = [a, b].find((i) => board[i].special === "color");
      let hits = new Set(harvestMatches(board).flat());
      if (color !== undefined) {
        const type = board[color === a ? b : a].type;
        hits = new Set(
          board.flatMap((c, i) => (c.type === type || i === color ? [i] : [])),
        );
      }
      if (!hits.size) continue;
      const counts = Array(5).fill(0);
      let score = 0;
      for (const i of hits) {
        counts[board[i].type]++;
        if (s.grass[i]) score += 4;
        else if (s.grass.some(Boolean)) {
          const distance = Math.min(
            ...s.grass.flatMap((n, j) =>
              n
                ? [
                    Math.abs((j % 7) - (i % 7)) +
                      Math.abs(Math.floor(j / 7) - Math.floor(i / 7)),
                  ]
                : [],
            ),
          );
          score += 0.15 / (1 + distance);
        }
      }
      score +=
        counts.reduce(
          (sum, n, i) =>
            sum + Math.min(n, Math.max(0, targets[i] - s.collected[i])) * 2,
          0,
        ) +
        hits.size * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = [a, b];
      }
    }
  return best;
}
function freshBoard(s, tutorial = false) {
  for (let attempt = 0; attempt < 80; attempt++) {
    s.board = [];
    for (let i = 0; i < 49; i++) {
      const choices = [0, 1, 2, 3, 4].filter(
        (t) =>
          !(
            i % 7 >= 2 &&
            s.board[i - 1].type === t &&
            s.board[i - 2].type === t
          ) &&
          !(i >= 14 && s.board[i - 7].type === t && s.board[i - 14].type === t),
      );
      s.board.push({ type: choices[random(s, choices.length)], special: null });
    }
    if (tutorial) {
      for (const [at, type] of [
        [0, 0],
        [1, 1],
        [2, 0],
        [8, 0],
      ])
        s.board[at] = { type, special: null };
    }
    if (!harvestMatches(s.board).length && firstMove(s)) return;
  }
  // Bounded deterministic fallback, including a known legal opening.
  s.board = Array.from({ length: 49 }, (_, i) => ({
    type: (i + Math.floor(i / 7)) % 5,
    special: null,
  }));
  for (const [at, type] of [
    [0, 0],
    [1, 1],
    [2, 0],
    [8, 0],
  ])
    s.board[at] = { type, special: null };
}
export function newHarvest(level = 1, mode = "normal", seed = Date.now()) {
  const config =
    HARVEST_LEVELS.find((l) => l.id === level) || HARVEST_LEVELS[0];
  const s = {
    version: 1,
    level: config.id,
    mode: mode === "relaxed" ? "relaxed" : "normal",
    seed: Number(seed) >>> 0,
    board: [],
    grass: Array(49).fill(0),
    collected: Array(5).fill(0),
    score: 0,
    moves: config.moves,
    turns: 0,
    status: "playing",
    shuffles: 1,
  };
  freshBoard(s, config.id === 1);
  const cells = Array.from({ length: 49 }, (_, i) => i);
  for (let i = 0; i < config.patches; i++)
    s.grass[cells.splice(random(s, cells.length), 1)[0]] = config.layers;
  return s;
}
function finish(s) {
  const config = HARVEST_LEVELS[s.level - 1];
  if (
    config.targets.every((n, i) => s.collected[i] >= n) &&
    !s.grass.some(Boolean)
  )
    s.status = "won";
  else if (s.mode === "normal" && s.moves <= 0) s.status = "lost";
}
export function harvestSwap(input, a, b) {
  if (input.status !== "playing" || !adjacent(a, b)) return null;
  const s = clone(input);
  swap(s.board, a, b);
  const colorAt = [a, b].find((i) => s.board[i].special === "color");
  let groups = harvestMatches(s.board),
    forced = [];
  if (colorAt !== undefined) {
    const target = s.board[colorAt === a ? b : a];
    forced = s.board.flatMap((c, i) =>
      target.special === "color" || c.type === target.type || i === colorAt
        ? [i]
        : [],
    );
  }
  if (!groups.length && !forced.length) return null;
  s.turns++;
  if (s.mode === "normal") s.moves--;
  const frames = [];
  for (
    let combo = 1;
    (groups.length || forced.length) && combo <= 40;
    combo++
  ) {
    const cleared = new Set([...groups.flat(), ...forced]);
    const creations = new Map();
    if (!forced.length)
      for (const group of groups)
        if (group.length >= 4) {
          const at =
            combo === 1 && group.includes(b)
              ? b
              : group[Math.floor(group.length / 2)];
          if (!s.board[at].special)
            creations.set(
              at,
              group.length >= 5
                ? "color"
                : group[1] - group[0] === 1
                  ? "row"
                  : "column",
            );
        }
    const activated = new Set(
      forced.length && colorAt !== undefined ? [colorAt] : [],
    );
    for (const i of cleared) {
      if (activated.has(i)) continue;
      activated.add(i);
      const c = s.board[i];
      if (c.special === "row")
        for (let j = 0; j < 7; j++) cleared.add(Math.floor(i / 7) * 7 + j);
      if (c.special === "column")
        for (let j = 0; j < 7; j++) cleared.add(j * 7 + (i % 7));
      if (c.special === "color")
        s.board.forEach((cell, j) => {
          if (cell.type === c.type) cleared.add(j);
        });
    }
    for (const i of cleared) {
      s.collected[s.board[i].type]++;
      s.grass[i] = Math.max(0, s.grass[i] - 1);
    }
    s.score += cleared.size * 10 * Math.min(combo, 8);
    for (const [at, special] of creations) {
      cleared.delete(at);
      s.board[at].special = special;
    }
    frames.push({
      board: s.board.map((c) => ({ ...c })),
      cleared: [...cleared],
      combo,
    });
    for (let col = 0; col < 7; col++) {
      const remaining = [];
      for (let row = 6; row >= 0; row--)
        if (!cleared.has(row * 7 + col)) remaining.push(s.board[row * 7 + col]);
      for (let row = 6; row >= 0; row--)
        s.board[row * 7 + col] = remaining[6 - row] || {
          type: random(s, 5),
          special: null,
        };
    }
    forced = [];
    groups = harvestMatches(s.board);
  }
  if (harvestMatches(s.board).length || !firstMove(s)) freshBoard(s);
  finish(s);
  return { world: s, frames };
}
export function shuffleHarvest(input) {
  if (input.status !== "playing" || input.shuffles <= 0) return null;
  const s = clone(input);
  freshBoard(s);
  s.shuffles--;
  return s;
}
export function harvestStars(s) {
  return s.status !== "won" || s.mode !== "normal"
    ? 0
    : s.moves >= 10
      ? 3
      : s.moves >= 4
        ? 2
        : 1;
}
export function restoreHarvest(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Number.isInteger(value.level) ||
    value.level < 1 ||
    value.level > 24 ||
    !["normal", "relaxed"].includes(value.mode) ||
    !["playing", "won", "lost"].includes(value.status)
  )
    return null;
  const bounded = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  if (
    !Array.isArray(value.board) ||
    value.board.length !== 49 ||
    !value.board.every(
      (c) =>
        c &&
        bounded(c.type, 4) &&
        [null, "row", "column", "color"].includes(c.special),
    )
  )
    return null;
  if (
    !Array.isArray(value.grass) ||
    value.grass.length !== 49 ||
    !value.grass.every((n) => bounded(n, 2)) ||
    !Array.isArray(value.collected) ||
    value.collected.length !== 5 ||
    !value.collected.every((n) => bounded(n, 10000000))
  )
    return null;
  if (
    !bounded(value.seed, 4294967295) ||
    !bounded(value.score, 1000000000) ||
    !bounded(value.turns, 1000000) ||
    !bounded(value.moves, HARVEST_LEVELS[value.level - 1].moves) ||
    !bounded(value.shuffles, 1) ||
    harvestMatches(value.board).length ||
    !firstMove(value)
  )
    return null;
  const s = clone(value);
  s.status = "playing";
  finish(s);
  return s;
}
