// Keep library choices independent of the DOM so combinations behave consistently.
export const QUICK_FILTERS = [
  ["all", "Any kind of break"],
  ["quick", "Quick break"],
  ["relaxing", "Relaxing"],
  ["challenging", "Challenging"],
  ["two", "2 players"],
];
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
  {
    category = "All games",
    quick = "all",
    search = "",
    favoritesOnly = false,
    sort = "featured",
  } = {},
  favorites = [],
) {
  const query = String(search).trim().toLocaleLowerCase(),
    saved = new Set(favorites);
  const matches = games.filter(
    (g) =>
      (category === "All games" || g.category === category) &&
      (!favoritesOnly || saved.has(g.id)) &&
      (!query ||
        [g.name, g.description, g.category].some((v) =>
          v.toLocaleLowerCase().includes(query),
        )) &&
      (quick === "all" ||
        (quick === "quick" && g.minutes <= 5) ||
        (quick === "relaxing" && g.mood === "Relaxing") ||
        (quick === "challenging" && g.mood === "Challenging") ||
        (quick === "two" && g.players === 2)),
  );
  if (sort === "name")
    matches.sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (sort === "shortest") matches.sort((a, b) => a.minutes - b.minutes);
  return matches;
}
