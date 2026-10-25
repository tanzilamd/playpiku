// Resolve the editable file once for both the browser and static build.
export function resolveSiteConfig(definitions, config) {
  const fail = (message) => {
    throw new Error(`src/site-config.js: ${message}`);
  };
  const text = (value, field) => {
    if (typeof value !== "string" || !value.trim())
      fail(`${field} must be non-empty text.`);
    return value;
  };
  if (!config || !Array.isArray(config.games)) fail("games must be a list.");
  const originals = new Map(definitions.map((game) => [game.id, game]));
  const overrides = new Map();
  for (const entry of config.games) {
    if (!entry || !originals.has(entry.id))
      fail(`Unknown game id: ${entry?.id}. Keep the existing IDs.`);
    if (overrides.has(entry.id))
      fail(`Game ${entry.id} appears more than once.`);
    const fields = {};
    for (const key of ["name", "description", "category"])
      if (entry[key] !== undefined)
        fields[key] = text(entry[key], `${entry.id}.${key}`);
    if (fields.category === "All games")
      fail(
        "All games is reserved for the library filter. Choose another category.",
      );
    for (const key of ["show", "isNew"])
      if (entry[key] !== undefined && typeof entry[key] !== "boolean")
        fail(`${entry.id}.${key} must be true or false, without quotes.`);
    if (entry.isNew !== undefined) fields.isNew = entry.isNew;
    overrides.set(entry.id, fields);
  }
  const games = definitions.map((game) => ({
    ...game,
    ...overrides.get(game.id),
  }));
  const byId = new Map(games.map((game) => [game.id, game]));
  const listedGames = config.games
    .filter((entry) => entry.show !== false)
    .map((entry) => byId.get(entry.id));
  if (!originals.has(config.featuredGame))
    fail("featuredGame must be an existing game ID.");
  const homepage = {};
  for (const key of [
    "badge",
    "titleFirst",
    "titleSecond",
    "subtitle",
    "subtitleSecond",
    "button",
    "libraryTitle",
    "libraryNote",
    "featureBadge",
    "featureSticker",
  ])
    homepage[key] = text(config.homepage?.[key], `homepage.${key}`);
  const developer = {
    name: text(config.developer?.name, "developer.name"),
    url: text(config.developer?.url, "developer.url"),
  };
  let url;
  try {
    url = new URL(developer.url);
  } catch {
    fail("developer.url must be a complete http:// or https:// link.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    fail("developer.url must use http:// or https://.");
  if (!/^#[a-f\d]{6}$/i.test(config.accentColor))
    fail("accentColor must be a six-digit hex color, for example #c7f36b.");
  const switches = (source, defaults, group) => {
    if (
      source !== undefined &&
      (!source || typeof source !== "object" || Array.isArray(source))
    )
      fail(`${group} must be an object of true/false switches.`);
    return Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => {
        const value =
          source && Object.hasOwn(source, key) ? source[key] : fallback;
        if (typeof value !== "boolean")
          fail(`${group}.${key} must be true or false, without quotes.`);
        return [key, value];
      }),
    );
  };
  const safeLink = (value, field, relative = false) => {
    text(value, field);
    if (relative && /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value))
      return value;
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      fail(
        `${field} must be a complete http:// or https:// link${relative ? " or a path beginning with /" : ""}.`,
      );
    }
    if (!["http:", "https:"].includes(parsed.protocol))
      fail(`${field} must use http:// or https://.`);
    return value;
  };
  if (
    config.announcement !== undefined &&
    (!config.announcement ||
      typeof config.announcement !== "object" ||
      Array.isArray(config.announcement))
  )
    fail("announcement must be an object with show, text, linkText and url.");
  const announcement = {
    show: false,
    text: "",
    linkText: "",
    url: "",
    ...config.announcement,
  };
  if (typeof announcement.show !== "boolean")
    fail("announcement.show must be true or false.");
  for (const key of ["text", "linkText", "url"])
    if (typeof announcement[key] !== "string")
      fail(`announcement.${key} must be text.`);
  if (announcement.show) text(announcement.text, "announcement.text");
  if (announcement.url) {
    safeLink(announcement.url, "announcement.url", true);
    text(announcement.linkText, "announcement.linkText");
  }
  if (config.socialLinks !== undefined && !Array.isArray(config.socialLinks))
    fail("socialLinks must be a list.");
  const socialLinks = (config.socialLinks || []).map((link, i) => ({
    label: text(link?.label, `socialLinks[${i}].label`),
    url: safeLink(link?.url, `socialLinks[${i}].url`),
  }));
  const sections = switches(
    config.sections,
    { hero: true, recent: true, breakNote: true, relatedGames: true },
    "sections",
  );
  const library = switches(
    config.library,
    { favorites: true, filters: true },
    "library",
  );
  const footerText = text(
    config.footerText ?? "Made for your “just one more” moments.",
    "footerText",
  );
  return {
    games,
    listedGames,
    featuredGame:
      listedGames.find((game) => game.id === config.featuredGame) ||
      listedGames[0] ||
      null,
    categories: [
      "All games",
      ...new Set(listedGames.map((game) => game.category)),
    ],
    siteConfig: {
      ...config,
      homepage,
      developer,
      announcement,
      socialLinks,
      sections,
      library,
      footerText,
    },
  };
}
export function contentFingerprint(value) {
  let hash = 2166136261;
  for (const char of JSON.stringify(value))
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
  return hash.toString(16).padStart(8, "0");
}
