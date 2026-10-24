import test from "node:test";
import assert from "node:assert/strict";
import config from "../src/site-config.js";
import { games } from "../src/catalog.js";
import { resolveSiteConfig, contentFingerprint } from "../src/configuration.js";
import { escapeHTML } from "../src/text.js";
const copy = () => ({
  ...structuredClone(config),
  featuredGame: "harvest",
  games: [
    { id: "harvest", show: true },
    { id: "traffic", show: true },
    { id: "snake", show: true },
  ],
});
test("one editable file controls listing order, text, badges and categories while keeping hidden game links", () => {
  const value = copy();
  const originalName = games.find((game) => game.id === "snake").name;
  value.games = [
    {
      id: "snake",
      show: true,
      name: "Garden Snake",
      description: "Take your time.",
      category: "Classics",
      isNew: true,
    },
    { id: "harvest", show: false },
    { id: "traffic", show: true, category: "Arcade" },
  ];
  const result = resolveSiteConfig(games, value);
  assert.deepEqual(
    result.listedGames.map((g) => g.id),
    ["snake", "traffic"],
  );
  assert.equal(result.listedGames[0].name, "Garden Snake");
  assert.equal(result.listedGames[0].isNew, true);
  assert.deepEqual(result.categories, ["All games", "Classics", "Arcade"]);
  assert.equal(result.featuredGame.id, "snake");
  assert.equal(result.games.length, games.length);
  assert.ok(result.games.some((g) => g.id === "harvest"));
  assert.equal(games.find((g) => g.id === "snake").name, originalName);
});
test("hidden or removed featured games fall back to the first visible game, and an empty list is valid", () => {
  const value = copy();
  value.games = [{ id: "snake" }, { id: "traffic" }];
  value.featuredGame = "traffic";
  assert.equal(resolveSiteConfig(games, value).featuredGame.id, "traffic");
  value.games = [];
  const empty = resolveSiteConfig(games, value);
  assert.equal(empty.featuredGame, null);
  assert.deepEqual(empty.categories, ["All games"]);
  assert.equal(empty.games.length, games.length);
});
test("invalid editor values fail with the settings filename and an actionable field error", () => {
  const edits = [
    (v) => v.games.push({ ...v.games[0] }),
    (v) => (v.games[0].id = "typo"),
    (v) => (v.games[0].show = "false"),
    (v) => (v.games[0].isNew = "true"),
    (v) => (v.games[0].name = ""),
    (v) => (v.games[0].category = "All games"),
    (v) => (v.featuredGame = "missing"),
    (v) => (v.homepage.titleFirst = 12),
    (v) => (v.accentColor = "green"),
    (v) => (v.developer.url = "not a link"),
    (v) => (v.developer.url = "javascript:alert(1)"),
  ];
  for (const edit of edits) {
    const value = copy();
    edit(value);
    assert.throws(
      () => resolveSiteConfig(games, value),
      /src\/site-config\.js:/,
    );
  }
});
test("text is rendered literally and share image revisions follow configuration content deterministically", () => {
  assert.equal(
    escapeHTML(`Tom's <Club> & "Friends"`),
    "Tom&#39;s &lt;Club&gt; &amp; &quot;Friends&quot;",
  );
  const value = copy();
  const first = contentFingerprint(value);
  assert.equal(contentFingerprint(copy()), first);
  value.games.reverse();
  assert.notEqual(contentFingerprint(value), first);
  value.games.reverse();
  value.homepage.titleFirst += " Updated.";
  assert.notEqual(contentFingerprint(value), first);
});
