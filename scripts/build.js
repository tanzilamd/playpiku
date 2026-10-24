import { mkdir, rm, cp, writeFile, readFile, access } from "node:fs/promises";
import { games } from "../src/catalog.js";
import { socialMetadata } from "../src/site.js";
import { renderPage } from "./pages.js";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of ["src", "favicon.svg", "assets"])
  await cp(file, `dist/${file}`, { recursive: true });
const template = await readFile("index.html", "utf8");
await writeFile("dist/index.html", renderPage(template, null, games.length));
for (const game of games) {
  const folder = `dist/play/${game.id}`;
  await mkdir(folder, { recursive: true });
  await writeFile(
    `${folder}/index.html`,
    renderPage(template, game, games.length),
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
