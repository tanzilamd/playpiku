import { games } from "./catalog.js";
import { art } from "./art.js";
import { arrow } from "./icons.js";
import { get, set, sound, storageUnavailable, clearRecords } from "./store.js";
const main = document.querySelector("main");
const dialog = document.querySelector("#modal");
let active = null,
  dispose = () => {},
  currentGame = null,
  category = "All games",
  modalAfter = null;

export function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("visible"), 3500);
}
function openModal(html, after = null) {
  if (dialog.open) dialog.close();
  modalAfter = after;
  active?.pause?.();
  document.querySelector("#modal-content").innerHTML = html;
  dialog.showModal();
  dialog
    .querySelector("[data-close]")
    ?.addEventListener("click", () => dialog.close());
}
dialog.addEventListener("close", () => {
  const cb = modalAfter;
  modalAfter = null;
  cb?.();
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
function help(game, first = false) {
  openModal(
    `<div class="modal-heading"><span class="eyebrow">A QUICK WALKTHROUGH</span><button class="icon-button" data-close aria-label="Close help">×</button></div><h2 id="modal-title">${game.name}, made simple.</h2><p>${game.goal}</p>${game.demo}<ol class="help-steps">${game.steps.map((s, i) => `<li><span>${i + 1}</span><p>${s}</p></li>`).join("")}</ol><div class="tip"><span aria-hidden="true">✦</span><p>${game.tip}</p></div><button class="button primary full" id="help-done">${first ? "Got it. Let’s play!" : "Back to the game"} <span aria-hidden="true">→</span></button>`,
    () =>
      document
        .querySelector("#game-start, #game-board button, #game-board")
        ?.focus({ preventScroll: true }),
  );
  document.querySelector("#help-done").onclick = () => dialog.close();
  set("seen:" + game.id, true);
}
function bestLabel(game) {
  const key =
    game.id === "memory"
      ? "memory-8"
      : game.id === "snake"
        ? "snake-normal"
        : game.id;
  const best = get("best:" + key);
  if (game.id === "tictactoe") return "Solo or with a friend";
  if (best === null) return "A fresh challenge awaits";
  return `Your best: ${best}${game.id === "reaction" ? " ms" : game.id === "memory" ? " moves · Easy" : " pts"}`;
}
function cards() {
  return games
    .filter((g) => category === "All games" || g.category === category)
    .map(
      (g, i) =>
        `<article class="game-card" style="--card-index:${i}"><a class="game-art art-${g.color}" href="#/play/${g.id}" aria-label="Play ${g.name}">${art[g.id]}<span class="art-play" aria-hidden="true">▶</span><span class="game-category">${g.category}</span></a><div class="card-body"><div class="card-heading"><h3><a href="#/play/${g.id}">${g.name}</a></h3><a href="#/play/${g.id}" class="card-arrow" aria-label="Play ${g.name}">${arrow}</a></div><p>${g.description}</p><div class="card-meta"><span class="status-dot"></span>${bestLabel(g)}</div></div></article>`,
    )
    .join("");
}
function home() {
  document.title = "PlayPiku — A little play goes a long way";
  const recent = get("recent");
  const recentGame = games.find((g) => g.id === recent);
  main.innerHTML = `<section class="hero"><div class="hero-copy"><div class="hero-badge"><span class="status-dot"></span> YOUR FIVE-MINUTE HAPPY PLACE</div><h1>A little play.<br>A <span>better day.</span><svg viewBox="0 0 390 18" aria-hidden="true"><path d="M4 12Q170-3 384 8"/></svg></h1><p>Big on fun. Light on everything else.<br>Pick a game, find your flow, and make a little time for play.</p><a href="#games" class="button primary" id="explore-games">Find your next favorite <span class="down-arrow">${arrow}</span></a><div class="hero-notes"><span>✓ No downloads</span><span>✓ No sign-ups</span><span>✓ Just play</span></div></div><a class="hero-feature" href="#/play/2048" aria-label="Play featured game 2048"><div class="feature-top"><span><i></i> A LITTLE BRAIN FOOD</span><span class="feature-star" aria-hidden="true">✳</span></div><div class="feature-art">${art["2048"]}</div><div class="feature-bottom"><div><span class="eyebrow">MEET YOUR NEXT OBSESSION</span><strong>Make room for 2048.</strong></div><span class="feature-button" aria-hidden="true">${arrow}</span></div><span class="floating-label">Just one more move…</span></a></section>
  <section class="library" id="games" aria-labelledby="library-title"><div class="section-heading"><div><span class="eyebrow">GOOD TIMES, ZERO INSTALLS</span><h2 id="library-title">Your next little escape<span>.</span></h2></div><span class="game-count">6 games. Endless “one more.”</span></div><div class="library-toolbar"><div class="filters" role="group" aria-label="Filter games">${["All games", "Puzzle", "Arcade", "Quick play"].map((c) => `<button data-filter="${c}" class="filter ${category === c ? "selected" : ""}" aria-pressed="${category === c}">${c}</button>`).join("")}</div><span class="library-note"><span aria-hidden="true">✦</span> A good break starts here</span></div><div class="game-grid" id="game-grid">${cards()}</div><p class="sr-only" id="filter-status" role="status"></p></section>
  ${recentGame ? `<a class="resume-banner" href="#/play/${recentGame.id}"><span class="resume-icon" aria-hidden="true">↶</span><div><span class="eyebrow">BACK FOR ANOTHER ROUND?</span><h3>Pick up with ${recentGame.name}.</h3><p>Your next personal best could be one game away.</p></div><span class="button secondary">Let’s play ${arrow}</span></a>` : ""}
  <section class="break-note"><div class="mini-spark" aria-hidden="true">✳</div><div><h2>Less scrolling. More playing.</h2><p>A tiny corner of the internet for a well-earned break.<br>No accounts, no noise. Just you and your next high score.</p></div><span class="note-doodle" aria-hidden="true">☺</span></section>`;
  document.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        category = b.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((el) => {
          el.classList.toggle("selected", el === b);
          el.setAttribute("aria-pressed", el === b);
        });
        document.querySelector("#game-grid").innerHTML = cards();
        document.querySelector("#filter-status").textContent =
          `${games.filter((g) => category === "All games" || g.category === category).length} games shown`;
      }),
  );
  document.querySelector("#explore-games").onclick = (e) => {
    e.preventDefault();
    document
      .querySelector("#games")
      .scrollIntoView({
        behavior: get("motion", false) ? "instant" : "smooth",
      });
  };
}
function confirmRestart() {
  if (!active?.isPlaying?.()) {
    active?.restart?.();
    return;
  }
  openModal(
    `<div class="modal-heading"><span class="eyebrow">FRESH START?</span><button data-close class="icon-button" aria-label="Close">×</button></div><h2 id="modal-title">Start a new game?</h2><p>Your current round will be lost. Your best score stays safe.</p><div class="modal-actions"><button class="button secondary" data-cancel>Keep this game</button><button class="button primary" data-confirm>Restart game</button></div>`,
  );
  dialog.querySelector("[data-cancel]").onclick = () => dialog.close();
  dialog.querySelector("[data-confirm]").onclick = () => {
    dialog.close();
    active?.restart?.();
  };
}
let navigationId = 0;
async function route() {
  const id = ++navigationId;
  if (dialog.open) dialog.close();
  dispose();
  dispose = () => {};
  active = null;
  const path = location.hash.replace(/^#\/?/, "");
  const game = games.find((g) => path === "play/" + g.id);
  currentGame = game;
  if (!game) {
    home();
    if (path && path !== "main" && path !== "games")
      toast("That game could not be found. Choose one below.");
    window.scrollTo(0, 0);
    return;
  }
  set("recent", game.id);
  document.title = `${game.name} — PlayPiku`;
  main.innerHTML = `<section class="game-page"><div class="game-breadcrumb"><a href="#/">← All games</a><span>${game.category}</span></div><div class="game-page-heading"><div><span class="eyebrow">${game.tag}</span><h1>${game.name}<span>.</span></h1><p>${game.description}</p></div><button class="button secondary" id="help-button"><span class="help-icon">?</span> How to play</button></div><div class="game-workspace"><div class="play-panel" id="play-panel"><div class="loading">Getting your game ready…</div></div><aside class="game-aside"><span class="eyebrow">THE LITTLE DETAILS</span><h2>Find your flow.</h2><div class="aside-rule"><span class="aside-icon">◎</span><div><h3>The goal</h3><p>${game.goal}</p></div></div><div class="aside-rule"><span class="aside-icon">⌘</span><div><h3>Your controls</h3><p>${game.keys}</p></div></div><div class="aside-tip"><span aria-hidden="true">✦</span><h3>A little tip</h3><p>${game.tip}</p></div><p class="local-note">Your records stay in this browser.<br>No account needed. Ever.</p><button id="aside-help" class="text-button">New here? Learn to play →</button></aside></div><section class="more-games"><div><span class="eyebrow">SWITCH THINGS UP</span><h2>Another kind of fun.</h2></div><div class="related-links">${games
    .filter((g) => g !== game)
    .slice(0, 3)
    .map(
      (g) =>
        `<a href="#/play/${g.id}"><span class="related-art art-${g.color}">${art[g.id]}</span><span>${g.name}</span>${arrow}</a>`,
    )
    .join("")}</div></section></section>`;
  document.querySelector("#help-button").onclick = document.querySelector(
    "#aside-help",
  ).onclick = () => help(game);
  window.scrollTo(0, 0);
  try {
    const module = await import(`./games/${game.id}.js`);
    if (id !== navigationId) return;
    active = module.mount(document.querySelector("#play-panel"), {
      restart: confirmRestart,
      toast,
      sound,
    });
    dispose = () => active?.destroy?.();
    if (!get("seen:" + game.id, false)) help(game, true);
  } catch (e) {
    console.error(e);
    if (id === navigationId)
      document.querySelector("#play-panel").innerHTML =
        '<p class="error-message">The game could not load. Please refresh to try again.</p>';
  }
}
document.querySelector("#about-button").onclick = () =>
  openModal(
    `<div class="modal-heading"><span class="eyebrow">HELLO, PLAYER</span><button data-close class="icon-button" aria-label="Close">×</button></div><h2 id="modal-title">A little corner for play.</h2><p>PlayPiku is a collection of six lovingly made browser games. A quick break, a friendly challenge, a new personal best — you’re in the right place.</p><div class="tip"><span>✦</span><p>No downloads, accounts, ads, or tracking scripts. Your scores and preferences are saved only in this browser. Clearing browser data removes them.</p></div><p>Built for curious minds and “just one more” moments.</p><a class="button primary full" href="https://tanzilahmed.tech/" target="_blank" rel="noopener noreferrer">Meet the developer, Tanzil ${arrow}<span class="sr-only"> (opens in a new tab)</span></a>`,
  );
document.querySelector("#settings-button").onclick = () => {
  openModal(
    `<div class="modal-heading"><span class="eyebrow">MAKE YOURSELF AT HOME</span><button data-close class="icon-button" aria-label="Close settings">×</button></div><h2 id="modal-title">Your kind of play.</h2><label class="setting-row"><span><strong>Game sounds</strong><small>Little notes for little victories. Off by default.</small></span><input type="checkbox" id="sound-setting" ${get("sound", false) ? "checked" : ""}></label><label class="setting-row"><span><strong>Reduce motion</strong><small>Keep transitions and decorative motion minimal.</small></span><input type="checkbox" id="motion-setting" ${get("motion", false) ? "checked" : ""}></label><div class="setting-row"><span><strong>Personal records</strong><small>Stored on this device, in this browser.</small></span><button class="button secondary small" id="clear-records">Reset records</button></div><p class="settings-status" role="status" id="settings-status">${storageUnavailable() ? "Browser storage is unavailable. Scores last only for this visit." : "Your preferences save automatically."}</p>`,
  );
  document.querySelector("#sound-setting").onchange = (e) => {
    set("sound", e.target.checked);
    sound("win");
  };
  document.querySelector("#motion-setting").onchange = (e) => {
    set("motion", e.target.checked);
    document.documentElement.classList.toggle(
      "reduce-motion",
      e.target.checked,
    );
  };
  document.querySelector("#clear-records").onclick = (e) => {
    if (e.target.dataset.confirm !== "yes") {
      e.target.dataset.confirm = "yes";
      e.target.textContent = "Confirm reset";
      document.querySelector("#settings-status").textContent =
        "Press Confirm reset to clear all best scores. Saved 2048 games are kept.";
      return;
    }
    clearRecords();
    e.target.textContent = "Records cleared";
    e.target.disabled = true;
    document.querySelector("#settings-status").textContent =
      "Your best scores have been reset.";
    if (!currentGame) home();
  };
};
document.querySelector(".skip-link").onclick = (e) => {
  e.preventDefault();
  main.focus();
  main.scrollIntoView();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) active?.pause?.();
});
window.addEventListener("hashchange", route);
document.documentElement.classList.toggle(
  "reduce-motion",
  get("motion", false),
);
route();
if (storageUnavailable())
  toast(
    "Storage is unavailable. You can play, but records will last only for this visit.",
  );
