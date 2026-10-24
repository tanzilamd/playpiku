export const WORD_THEMES = {
  nature: ["RIVER", "LEAF", "OCEAN", "MOON", "RAIN", "TREE", "SUN", "CLOUD"],
  animals: [
    "PANDA",
    "KOALA",
    "OTTER",
    "TIGER",
    "ZEBRA",
    "MOUSE",
    "WHALE",
    "ROBIN",
  ],
  food: [
    "APPLE",
    "BREAD",
    "MANGO",
    "PEACH",
    "HONEY",
    "OLIVE",
    "COCOA",
    "LEMON",
  ],
};
export const WORD_MODES = {
  easy: {
    label: "Easy · 6 words",
    count: 6,
    directions: [
      [1, 0],
      [0, 1],
    ],
  },
  classic: {
    label: "Classic · 8 words",
    count: 8,
    directions: [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ],
  },
};
function shuffled(items, random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function wordPath(from, to, size = 8) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= size * size ||
    to >= size * size
  )
    return [];
  const x = from % size,
    y = Math.floor(from / size),
    dx = (to % size) - x,
    dy = Math.floor(to / size) - y;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return [];
  const length = Math.max(Math.abs(dx), Math.abs(dy)) + 1;
  return Array.from(
    { length },
    (_, i) => (y + Math.sign(dy) * i) * size + x + Math.sign(dx) * i,
  );
}
export function createWordBoard(
  theme = "nature",
  mode = "easy",
  random = Math.random,
) {
  const size = 8,
    config = WORD_MODES[mode] || WORD_MODES.easy,
    words = shuffled(WORD_THEMES[theme] || WORD_THEMES.nature, random).slice(
      0,
      config.count,
    );
  let grid = Array(size * size).fill(""),
    placements = {};
  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    const candidates = [];
    for (let i = 0; i < size * size; i++)
      for (const [dx, dy] of config.directions) {
        const x = i % size,
          y = Math.floor(i / size),
          ex = x + dx * (word.length - 1),
          ey = y + dy * (word.length - 1);
        if (ex < 0 || ex >= size || ey < 0 || ey >= size) continue;
        const path = wordPath(i, ey * size + ex, size);
        if (path.every((cell, n) => !grid[cell] || grid[cell] === word[n]))
          candidates.push(path);
      }
    if (!candidates.length) {
      grid = Array(size * size).fill("");
      placements = {};
      words.forEach((w, row) => {
        const path = Array.from({ length: w.length }, (_, x) => row * size + x);
        path.forEach((i, n) => (grid[i] = w[n]));
        placements[w] = path;
      });
      break;
    }
    const path = candidates[Math.floor(random() * candidates.length)];
    path.forEach((i, n) => (grid[i] = word[n]));
    placements[word] = path;
  }
  grid = grid.map(
    (letter) => letter || String.fromCharCode(65 + Math.floor(random() * 26)),
  );
  return { size, words, grid, placements };
}
export function selectedWord(puzzle, path, found = []) {
  if (
    path.length < 2 ||
    wordPath(path[0], path.at(-1), puzzle.size).join(",") !== path.join(",")
  )
    return null;
  const text = path.map((i) => puzzle.grid[i]).join(""),
    reverse = [...text].reverse().join("");
  return (
    puzzle.words.find(
      (w) => !found.includes(w) && (w === text || w === reverse),
    ) || null
  );
}
