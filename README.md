# PlayPiku

A little play. A better day. Twelve original browser games with an English interface, responsive layouts, first-visit tutorials, keyboard and touch controls, and local personal records.

**Games:** Mini Golf, Word Hunt, Piku Stack, Block Puzzle, Minesweeper, Piku Dash, 2048, Memory Match, Snake, Reaction Test, Tic Tac Toe, and Brick Breaker.

**Production:** [PlayPiku](https://tanzilahmed.tech/playpiku/) · [Deployment workflow](https://github.com/tanzilamd/playpiku/actions/workflows/pages.yml)

Built with HTML, CSS, and JavaScript modules. No runtime dependencies, remote fonts, game embeds, accounts, advertisements, or analytics. Developed by [Tanzil](https://tanzilahmed.tech/).

## Local development

Use Node.js 24 and npm. From the existing checkout (no worktree is needed):

```sh
npm ci
npm run dev
```

Open the local server on port 4173. The server also supports the `/playpiku/` prefix to test GitHub project-site paths. Set `PORT` to use another port. Production output is entirely static; the Node server is for development only.

```sh
npm test             # Game rules, including exhaustive hard-mode computer play
npm run test:e2e     # Desktop and mobile Chromium game workflows
npm run build       # Writes deployable files to dist/
```

Browser tests use `/usr/bin/chromium` by default. If unavailable, install the Playwright browser with `npx playwright install --with-deps chromium` and set `CHROMIUM_PATH` to the path printed by:

```sh
node --input-type=module -e 'import { chromium } from "@playwright/test"; console.log(chromium.executablePath())'
```

To check the built output, run `SERVE_DIR=dist npm run dev`. Route URLs use hashes, so direct links and reloads work on GitHub Pages without a custom 404 page.

To run the same desktop/mobile interaction checks against the deployed site:

```sh
PLAYPIKU_BASE_URL=https://tanzilahmed.tech/playpiku/ npm run test:e2e
```

Live mode skips the local server and uses `HTTPS_PROXY` when configured. Keep TLS verification enabled and ensure Chromium can access its certificate trust database. Tests use fresh browser contexts and change only their own browser storage; they do not change server data.

## Publish with GitHub Pages

1. Push this checkout to `tanzilamd/playpiku` on `main`.
2. In the repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. The **Test and deploy PlayPiku** workflow tests, builds, and publishes `dist/`. If the first run happened before enabling Pages, rerun it from **Actions**, or use **Run workflow**.
4. GitHub reports the live address in the deployment. This project currently inherits the account site’s custom domain, so its production address is `https://tanzilahmed.tech/playpiku/`. The default `tanzilamd.github.io` address may redirect to that domain. Do not add or change a project `CNAME` to override the account domain unless explicitly requested.
5. In Pages settings, enable **Enforce HTTPS** when available. The custom domain’s certificate is approved, but HTTPS enforcement is a separate setting requiring repository administration access.

GitHub Pages must be available for the repository's visibility and account plan. No paid domain is needed. The browser games need no backend, so there is no server sleep behavior.

## What stays on the device

Best scores, settings, first-visit guide preferences, and the current 2048 and Block Puzzle boards and Mini Golf progress between shots use namespaced `localStorage`. They do not sync across devices. If storage is blocked, games still work and state lasts only for the current visit. Reset records in Settings clears best scores; clearing browser site data clears everything.

Memory has three board sizes and separate best move counts. Snake has three speeds and separate best scores. Reaction Test records the best five-round average in milliseconds; device/input latency affects results. Tic Tac Toe supports two players on one device or easy/hard computer opponents, with a session-only match tally. Brick Breaker has three levels and three lives.

Block Puzzle supports tap-to-place, drag-and-drop, and keyboard placement on an 8 × 8 board, simultaneous row/column clears, consecutive-clear combos, and automatic board restoration. Minesweeper has three board sizes, a safe first reveal (including its neighbors), mobile Flag mode, right-click/F flags, number chording, and per-difficulty best times. Random Minesweeper boards can require a guess. Piku Dash has double jumps, collectible stars, forgiving hitboxes, and capped, gradually increasing speed.

Mini Golf features six handcrafted holes, drag-to-shoot plus keyboard/slider controls, wall bounces, between-shot round saving, and a best total shot count. Word Hunt offers three topics, Easy/Classic puzzles, tap endpoints, drag or keyboard selection, and a paused stopwatch. Hints add 30 seconds to the final record time; there is no time limit. Piku Stack offers Relaxed/Classic modes, forgiving perfect-drop windows, width recovery, and separate height records.

The whole-site layout suite checks every game and help dialog across phone, landscape, tablet, and desktop widths, including large Memory Match and Minesweeper boards.

## Accessibility and controls

All navigation and button-based games support keyboard interaction. The rules explain keyboard and touch controls per game. Timed/action games pause when hidden or when a help/settings dialog opens; they resume only when requested. Motion follows the operating system preference and can also be reduced in Settings. Sound is optional and off by default. Canvas-based Mini Golf, Piku Stack, Snake, Brick Breaker, and Piku Dash expose controls and score/status text but do not provide a fully equivalent nonvisual gameplay mode.

## Project structure

- `src/app.js`: routes, library, dialogs, preferences
- `src/catalog.js`: English game descriptions and tutorials
- `src/art.js`: original inline SVG game illustrations
- `src/rules.js`: independently tested original game rules
- `src/engines/`: independent rules, puzzle generation, and physics for the newer games
- `src/games/`: game controllers with cleanup on navigation
- `scripts/`: local server and static build
- `tests/`: rule and browser interaction tests
- `.github/workflows/pages.yml`: validation and GitHub Pages deployment

## Link previews

The initial HTML includes Open Graph and Twitter metadata for crawlers that do not run JavaScript. `assets/playpiku-share-v1.png` is a 1200 × 630 PNG and is included in `dist/`. All hash-based game links share the arcade preview because URL fragments are not sent to preview crawlers.

Regenerate the branded card with `node scripts/generate-share-card.js` after installing development dependencies and Chromium. The script uses local SVG art and no external images or fonts. Update the versioned image URL in `index.html` if the card changes so social platforms can fetch the new asset. Platforms may retain older previews until their cached scrape refreshes.
