import {
  mkdir,
  rm,
  cp,
  writeFile,
  readFile,
  access,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { versionModule, versionEntry } from "./release.js";
import { games, listedGames } from "../src/catalog.js";
import { socialMetadata, SHARE_REVISION, SHARE_VERSION } from "../src/site.js";
import { renderPage } from "./pages.js";
let manifest = {};
try {
  manifest = JSON.parse(await readFile("assets/share-manifest.json", "utf8"));
} catch {}
const expectedImages = [null, ...games].map((game) =>
  new URL(socialMetadata(game).image).pathname.replace("/playpiku/", ""),
);
const imagesAvailable = await Promise.all(
  expectedImages.map((file) =>
    access(file).then(
      () => true,
      () => false,
    ),
  ),
);
if (
  manifest.revision !== SHARE_REVISION ||
  manifest.version !== SHARE_VERSION ||
  imagesAvailable.includes(false)
) {
  await import("./generate-share-card.js");
}
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of ["src", "favicon.svg", "assets"])
  await cp(file, `dist/${file}`, { recursive: true });
async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? sourceFiles(`${directory}/${e.name}`)
        : [`${directory}/${e.name}`],
    ),
  );
  return nested.flat().sort();
}
const files = await sourceFiles("src");
const hash = createHash("sha256");
for (const file of [
  "index.html",
  "scripts/build.js",
  "scripts/release.js",
  "scripts/pages.js",
  ...files,
]) {
  hash.update(file + "\0");
  hash.update(await readFile(file));
  hash.update("\0");
}
const release = hash.digest("hex").slice(0, 12);
for (const file of files.filter((path) => path.endsWith(".js"))) {
  await writeFile(
    `dist/${file}`,
    versionModule(await readFile(file, "utf8"), release),
  );
}
const template = versionEntry(await readFile("index.html", "utf8"), release);
await writeFile(
  "dist/index.html",
  renderPage(template, null, listedGames.length),
);
for (const game of games) {
  const folder = `dist/play/${game.id}`;
  await mkdir(folder, { recursive: true });
  await writeFile(
    `${folder}/index.html`,
    renderPage(template, game, listedGames.length),
  );
  const image = new URL(socialMetadata(game).image).pathname.replace(
    "/playpiku/",
    "",
  );
  await access(`dist/${image}`);
}
await access(
  "dist/" + new URL(socialMetadata().image).pathname.replace("/playpiku/", ""),
);
await writeFile("dist/.nojekyll", "");
console.log(
  `Built homepage and ${games.length} game pages with static share metadata.`,
);
