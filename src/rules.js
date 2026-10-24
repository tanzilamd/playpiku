export function mergeLine(line) {
  const values = line.filter(Boolean),
    result = [];
  let score = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const value = values[i] * 2;
      result.push(value);
      score += value;
      i++;
    } else result.push(values[i]);
  }
  return {
    line: result.concat(Array(line.length - result.length).fill(0)),
    score,
  };
}
export function move2048(board, direction) {
  const result = [...board];
  let score = 0;
  for (let axis = 0; axis < 4; axis++) {
    const indices = Array.from({ length: 4 }, (_, n) =>
      direction === "left"
        ? axis * 4 + n
        : direction === "right"
          ? axis * 4 + 3 - n
          : direction === "up"
            ? n * 4 + axis
            : (3 - n) * 4 + axis,
    );
    const merged = mergeLine(indices.map((i) => board[i]));
    score += merged.score;
    indices.forEach((index, i) => (result[index] = merged.line[i]));
  }
  return { board: result, score, moved: result.some((v, i) => v !== board[i]) };
}
export function canMove2048(board) {
  return (
    board.includes(0) ||
    ["left", "up", "right", "down"].some((d) => move2048(board, d).moved)
  );
}
export const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function winner(board) {
  const line = winningLines.find(
    ([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c],
  );
  return line
    ? { player: board[line[0]], line }
    : board.every(Boolean)
      ? { player: "draw", line: [] }
      : null;
}
export function bestMove(board, player = "O") {
  const opponent = player === "O" ? "X" : "O";
  function minimax(b, turn, depth) {
    const end = winner(b);
    if (end)
      return end.player === "draw"
        ? 0
        : end.player === player
          ? 10 - depth
          : depth - 10;
    const values = b.flatMap((value, i) => {
      if (value) return [];
      const next = [...b];
      next[i] = turn;
      return [minimax(next, turn === player ? opponent : player, depth + 1)];
    });
    return turn === player ? Math.max(...values) : Math.min(...values);
  }
  let best = -Infinity,
    choice = null;
  for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7])
    if (!board[i]) {
      const next = [...board];
      next[i] = player;
      const value = minimax(next, opponent, 0);
      if (value > best) {
        best = value;
        choice = i;
      }
    }
  return choice;
}
export function nextSnake(snake, direction, food, size) {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const ate = head.x === food.x && head.y === food.y;
  const body = ate ? snake : snake.slice(0, -1);
  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= size ||
    head.y >= size ||
    body.some((s) => s.x === head.x && s.y === head.y)
  )
    return { snake, ate: false, dead: true };
  return {
    snake: [head, ...snake].slice(0, snake.length + (ate ? 1 : 0)),
    ate,
    dead: false,
  };
}
export function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
