// Generate committed PNGs so crawlers need neither JavaScript nor SVG support.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { games, listedGames, siteConfig } from "../src/catalog.js";
import { art } from "../src/art.js";
import { SHARE_VERSION, SHARE_REVISION } from "../src/site.js";
const favicon = await readFile(
  new URL("../favicon.svg", import.meta.url),
  "utf8",
);
const copy = siteConfig.homepage;
const palette = {
  harvest: "#b4c98d",
  highway: "#9dbbb6",
  trails: "#b8c7b5",
  racing: "#83ac8c",
  defense: "#8bb398",
  fairway: "#94b8a3",
  paper: "#d8d1af",
  lavender: "#a5a6cb",
  mint: "#9ac7b3",
  sand: "#d9c49a",
  night: "#29414a",
  gold: "#eac987",
  purple: "#b6a1d7",
  green: "#b4d299",
  coral: "#e6a58e",
  blue: "#9fcbd3",
  peach: "#a35e4d",
};
const escape = (s) =>
  String(s).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  for (const game of [null, ...games]) {
    await page.setContent(
      `<!doctype html><html lang="en"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#11151e;color:#f1f0e9;font-family:Arial,sans-serif}svg{display:block;width:100%;height:100%}.canvas{padding:46px 54px;position:relative;width:1200px;height:630px}.brand{display:flex;align-items:center;gap:13px;font-size:35px;font-weight:800;letter-spacing:-1.7px}.logo{width:46px;height:46px;transform:rotate(-6deg)}.brand b,.lime{color:${siteConfig.accentColor}}.badge{display:inline-block;margin-top:40px;border:1px solid #4a6337;border-radius:22px;background:#202d20;color:#cde4ac;font-size:14px;letter-spacing:2px;padding:9px 14px;font-weight:bold}h1{font-size:${game ? "70" : "77"}px;line-height:1.06;font-weight:800;letter-spacing:-3px;margin:22px 0 23px;max-width:575px}p{font-size:23px;line-height:1.5;color:#b4bbc7;margin:0;max-width:560px}.notes{position:absolute;bottom:50px;left:56px;font-size:16px;color:#c4d5ad}.notes i{font-style:normal;color:${siteConfig.accentColor};margin-right:7px}.notes span{margin-right:20px}.games{position:absolute;left:675px;top:42px;width:470px;display:grid;grid-template-columns:repeat(2,1fr);gap:15px;transform:rotate(2deg)}.card{height:160px;border:1px solid #4a535b;border-radius:15px;overflow:hidden;background:#1b2230}.picture{height:123px;overflow:hidden}.picture svg{transform:scale(1.06)}.name{font-size:14px;font-weight:bold;line-height:36px;padding:0 13px;color:#eeeede;display:flex;justify-content:space-between}.name span{color:${siteConfig.accentColor}}.address{position:absolute;right:55px;bottom:45px;font-size:16px;color:#9ca8a9}.feature{position:absolute;left:670px;top:119px;width:475px;height:355px;border:1px solid #667163;border-radius:23px;overflow:hidden;transform:rotate(2deg);background:${game ? palette[game.color] : ""}}.feature svg{height:285px;transform:scale(1.08)}.feature-label{height:70px;background:#1d2630;color:#d9efb8;font-weight:700;display:flex;align-items:center;justify-content:space-between;padding:0 24px;font-size:17px}.feature-label span{font-size:26px}</style><div class="canvas"><div class="brand"><span class="logo">${favicon}</span><span>play<b>piku.</b></span></div><div class="badge">${game ? escape(game.category.toUpperCase()) + " · PLAY FREE" : listedGames.length + " FREE BROWSER GAMES"}</div><h1>${game ? escape(game.name) : `${escape(copy.titleFirst)}<br><span class="lime">${escape(copy.titleSecond)}</span>`}</h1><p>${game ? escape(game.description) : `${escape(copy.subtitle)}<br>${escape(copy.subtitleSecond)}`}</p><div class="notes"><span><i>✓</i>No downloads</span><span><i>✓</i>No sign-ups</span><span><i>✓</i>Just play</span></div>${
        game
          ? `<div class="feature">${art[game.id]}<div class="feature-label">${escape(game.tag)}<span>→</span></div></div>`
          : `<div class="games">${listedGames
              .slice(0, 6)
              .map(
                (g) =>
                  `<div class="card"><div class="picture" style="background:${palette[g.color]}">${art[g.id]}</div><div class="name">${escape(g.name)}<span>→</span></div></div>`,
              )
              .join("")}</div>`
      }<div class="address">tanzilahmed.tech/playpiku${game ? "/play/" + game.id + "/" : ""}</div></div></html>`,
    );
    const file = `assets/${game ? "share-" + game.id : "playpiku-share"}-${SHARE_VERSION}.png`;
    await page.screenshot({
      path: new URL("../" + file, import.meta.url).pathname,
    });
    console.log("Generated " + file);
  }
} finally {
  await browser.close();
}

await writeFile(
  new URL("../assets/share-manifest.json", import.meta.url),
  JSON.stringify({ version: SHARE_VERSION, revision: SHARE_REVISION }) + "\n",
);
