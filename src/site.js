import { games, listedGames, siteConfig } from "./catalog.js";
import { contentFingerprint } from "./configuration.js";
export const SITE_PATH = "/playpiku/";
export const SITE_URL = "https://tanzilahmed.tech/playpiku/";
export const SHARE_VERSION = "v3";
export const SHARE_REVISION = contentFingerprint({ config: siteConfig, games });
export function gamePath(id) {
  return `${SITE_PATH}play/${encodeURIComponent(id)}/`;
}
export function socialMetadata(game = null, count = listedGames.length) {
  const url = game ? new URL(`play/${game.id}/`, SITE_URL).href : SITE_URL;
  return {
    url,
    title: game
      ? `${game.name} — PlayPiku`
      : `PlayPiku — ${siteConfig.homepage.titleFirst} ${siteConfig.homepage.titleSecond}`,
    description: game
      ? game.description
      : `${count} free browser games. ${siteConfig.homepage.subtitle} ${siteConfig.homepage.subtitleSecond}`,
    image: new URL(
      `assets/${game ? `share-${game.id}` : "playpiku-share"}-${SHARE_VERSION}.png?rev=${SHARE_REVISION}`,
      SITE_URL,
    ).href,
    alt: game
      ? `${game.name} on PlayPiku. ${game.description}`
      : `PlayPiku — ${count} free browser games. ${siteConfig.homepage.titleFirst} ${siteConfig.homepage.titleSecond}`,
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
