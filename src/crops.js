import { CROPS } from "./engines/harvest.js";
export function cropSVG(type) {
  const crop = CROPS[type];
  const shapes = [
    '<path d="M15 17C5 13 7 33 23 42Q27 44 31 39C44 25 42 12 31 16Q24 20 15 17Z"/><path fill="#6d9454" d="M24 18L13 10L23 12L27 5L29 13L39 10L32 20Z"/><g fill="#ffe6b8"><circle cx="18" cy="25" r="1.3"/><circle cx="28" cy="26" r="1.3"/><circle cx="23" cy="34" r="1.3"/></g>',
    '<path d="M12 19Q24 9 35 20L17 43Q12 46 13 39Z"/><path fill="#6d9454" d="M27 17Q18 5 23 4Q28 5 29 13Q35 1 39 7Q39 12 31 18Z"/><path d="M17 24L23 28M15 32L19 34" fill="none" stroke="#a76943" stroke-width="2"/>',
    '<circle cx="25" cy="28" r="16"/><path d="M25 15L28 20L34 20L29 24L31 30L25 27L20 31L21 24L16 21L22 20Z" fill="#6664a0"/><path fill="#6d9454" d="M27 14Q27 4 39 7Q36 17 27 14Z"/>',
    '<path d="M19 16C21 11 29 11 31 17L33 23C45 36 35 44 24 43C12 43 5 34 16 23Z"/><path d="M25 13Q22 5 28 4" stroke="#75604b" stroke-width="3" fill="none"/><path fill="#6d9454" d="M26 12Q32 2 40 9Q36 16 26 12Z"/>',
    '<g><ellipse cx="25" cy="13" rx="7" ry="10"/><ellipse cx="25" cy="37" rx="7" ry="10"/><ellipse cx="13" cy="25" rx="10" ry="7"/><ellipse cx="37" cy="25" rx="10" ry="7"/><ellipse cx="16" cy="16" rx="7" ry="9" transform="rotate(-45 16 16)"/><ellipse cx="34" cy="34" rx="7" ry="9" transform="rotate(-45 34 34)"/><ellipse cx="34" cy="16" rx="7" ry="9" transform="rotate(45 34 16)"/><ellipse cx="16" cy="34" rx="7" ry="9" transform="rotate(45 16 34)"/></g><circle cx="25" cy="25" r="9" fill="#986c48"/>',
  ];
  return `<svg viewBox="0 0 50 50" aria-hidden="true" fill="${crop.color}">${shapes[type]}<circle cx="20" cy="29" r="1.4" fill="#394331"/><circle cx="29" cy="29" r="1.4" fill="#394331"/></svg>`;
}
