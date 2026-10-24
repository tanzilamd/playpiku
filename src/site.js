export const SITE_PATH = "/playpiku/";
export const SITE_URL = "https://tanzilahmed.tech/playpiku/";
export const SHARE_VERSION = "v3";
export function gamePath(id) {
  return `${SITE_PATH}play/${encodeURIComponent(id)}/`;
}
export function socialMetadata(game = null, count = 17) {
  const url = game ? new URL(`play/${game.id}/`, SITE_URL).href : SITE_URL;
  return {
    url,
    title: game
      ? `${game.name} — PlayPiku`
      : "PlayPiku — A little play. A better day.",
    description: game
      ? game.goal
      : `${count} free browser games. Puzzles, races, strategy, and little adventures. No downloads or sign-ups — just play.`,
    image: new URL(
      `assets/${game ? `share-${game.id}` : "playpiku-share"}-${SHARE_VERSION}.png`,
      SITE_URL,
    ).href,
    alt: game
      ? `${game.name} on PlayPiku. ${game.description}`
      : `PlayPiku — ${count} free browser games. A little play. A better day.`,
  };
}
export function readRoute(location) {
  const legacy = /^#\/(?:play\/([a-z0-9-]+)\/?)?$/.exec(location.hash);
  if (legacy) return { id: legacy[1] || null, legacy: true };
  const match = new RegExp("^" + SITE_PATH + "play/([a-z0-9-]+)/?$").exec(
    location.pathname,
  );
  if (match) return { id: match[1], legacy: false };
  return {
    id:
      location.pathname === SITE_PATH ||
      location.pathname === SITE_PATH + "index.html" ||
      location.pathname === "/"
        ? null
        : "!missing",
    legacy: false,
  };
}
