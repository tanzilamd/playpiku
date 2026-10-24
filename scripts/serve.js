import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { games } from "../src/catalog.js";
import { renderPage } from "./pages.js";
const root = resolve(process.env.SERVE_DIR || ".");
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const requested = decodeURIComponent(url.pathname).replace(
        /^\/playpiku(?=\/|$)/,
        "",
      );
      const gameMatch = /^\/play\/([a-z0-9-]+)\/?$/.exec(requested);
      const game = gameMatch && games.find((g) => g.id === gameMatch[1]);
      if (game && !url.pathname.endsWith("/")) {
        res.writeHead(301, { Location: url.pathname + "/" + url.search });
        res.end();
        return;
      }
      if (game && root === resolve(import.meta.dirname, "..")) {
        const template = await readFile(resolve(root, "index.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderPage(template, game, games.length));
        return;
      }
      let file = resolve(root, "." + (requested || "/"));
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      const body = await readFile(file);
      const contentType = mime[extname(file)] || "application/octet-stream";
      const binary =
        contentType === "image/png" ||
        contentType === "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType + (binary ? "" : "; charset=utf-8"),
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT || 4173), "0.0.0.0", () =>
    console.log("PlayPiku server ready on port " + (process.env.PORT || 4173)),
  );
