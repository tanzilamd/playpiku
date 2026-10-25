// Preserve the configured game order for the category and Favorites views.
export function normalizeFavorites(value, knownIds) {
  const known = new Set(knownIds);
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter((id) => typeof id === "string" && known.has(id)),
        ),
      ]
    : [];
}
export function filterLibrary(
  games,
  { category = "All games", favoritesOnly = false } = {},
  favorites = [],
) {
  const saved = new Set(favorites);
  return games.filter((game) =>
    favoritesOnly
      ? saved.has(game.id)
      : category === "All games" || game.category === category,
  );
}
