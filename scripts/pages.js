import { socialMetadata } from "../src/site.js";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderPage(template, game = null, count = 14) {
  const meta = socialMetadata(game, count);
  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escape(meta.title)}</title>`,
  );
  const properties = {
    "og:url": meta.url,
    "og:title": meta.title,
    "og:description": meta.description,
    "og:image": meta.image,
    "og:image:secure_url": meta.image,
    "og:image:alt": meta.alt,
    "twitter:title": meta.title,
    "twitter:description": meta.description,
    "twitter:image": meta.image,
    "twitter:image:alt": meta.alt,
    description: meta.description,
  };
  for (const [name, value] of Object.entries(properties)) {
    const pattern = new RegExp(
      '(<meta\\s+(?:property|name)="' +
        name +
        '"\\s+content=")[^"]*("\\s*\\/?>)',
      "g",
    );
    html = html.replace(pattern, (_, a, b) => a + escape(value) + b);
  }
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*("\s*\/?>)/,
    (_, a, b) => a + escape(meta.url) + b,
  );
  if (game)
    html = html.replace(
      '<main id="main" tabindex="-1"></main>',
      `<main id="main" tabindex="-1"><noscript><section class="game-page"><h1>${escape(game.name)}</h1><p>${escape(game.goal)}</p><p>Enable JavaScript to play this free browser game.</p><a href="/playpiku/">Browse all games</a></section></noscript></main>`,
    );
  return html;
}
