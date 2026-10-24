import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
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
