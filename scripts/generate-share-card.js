// Run manually when the arcade branding changes; the generated PNG is committed.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { art } from "../src/art.js";
const favicon = await readFile(
  new URL("../favicon.svg", import.meta.url),
  "utf8",
);
const cards = [
  ["golf", "Mini Golf", "#94b8a3"],
  ["words", "Word Hunt", "#d8d1af"],
  ["stack", "Piku Stack", "#a5a6cb"],
  ["blocks", "Block Puzzle", "#9ac7b3"],
  ["mines", "Minesweeper", "#d9c49a"],
  ["dash", "Piku Dash", "#29414a"],
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
 *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#11151e;color:#f1f0e9;font-family:Arial,sans-serif}svg{display:block;width:100%;height:100%}.canvas{padding:46px 54px;position:relative;width:1200px;height:630px}.brand{display:flex;align-items:center;gap:13px;font-size:35px;font-weight:800;letter-spacing:-1.7px}.logo{width:46px;height:46px;transform:rotate(-6deg)}.brand b,.lime{color:#c7f36b}.badge{display:inline-block;margin-top:40px;border:1px solid #4a6337;border-radius:22px;background:#202d20;color:#cde4ac;font-size:14px;letter-spacing:2px;padding:9px 14px;font-weight:bold}.badge:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#c7f36b;margin-right:9px}h1{font-size:77px;line-height:1.05;font-weight:800;letter-spacing:-3.8px;margin:22px 0 23px}p{font-size:22px;line-height:1.55;color:#b4bbc7;margin:0}.notes{position:absolute;bottom:50px;left:56px;font-size:16px;letter-spacing:.1px;color:#c4d5ad}.notes i{font-style:normal;color:#c7f36b;margin:0 7px 0 0}.notes span{margin-right:20px}.games{position:absolute;left:675px;top:42px;width:470px;display:grid;grid-template-columns:repeat(2,1fr);gap:15px;transform:rotate(2deg)}.card{height:160px;border:1px solid #4a535b;border-radius:15px;overflow:hidden;background:#1b2230;box-shadow:0 5px 10px #0002}.picture{height:123px;overflow:hidden}.picture svg{transform:scale(1.06)}.name{font-size:15px;font-weight:bold;line-height:36px;padding:0 13px;color:#eeeede;display:flex;justify-content:space-between}.name span{color:#c7f36b;font-size:18px}.address{position:absolute;right:55px;bottom:45px;font-size:17px;letter-spacing:.3px;color:#9ca8a9}
 </style><div class="canvas"><div class="brand"><span class="logo">${favicon}</span><span>play<b>piku.</b></span></div><div class="badge">12 FREE BROWSER GAMES</div><h1>A little play.<br>A <span class="lime">better day.</span></h1><p>Your next little escape is one tap away.<br>Puzzles, arcade classics, and more.</p><div class="notes"><span><i>✓</i>No downloads</span><span><i>✓</i>No sign-ups</span><span><i>✓</i>Just play</span></div><div class="games">${cards.map(([id, name, color]) => `<div class="card"><div class="picture" style="background:${color}">${art[id]}</div><div class="name">${name}<span>→</span></div></div>`).join("")}</div><div class="address">tanzilahmed.tech/playpiku</div></div></html>`);
  await page.screenshot({
    path: new URL("../assets/playpiku-share-v1.png", import.meta.url).pathname,
  });
  console.log("Generated assets/playpiku-share-v1.png (1200 × 630)");
} finally {
  await browser.close();
}
