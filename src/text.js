export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export function displayGame(game) {
  return Object.fromEntries(
    Object.entries(game).map(([key, value]) => [
      key,
      ["name", "description", "category", "tag"].includes(key)
        ? escapeHTML(value)
        : value,
    ]),
  );
}
