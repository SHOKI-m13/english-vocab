import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const assets = new Set(["index.html", "app.js", "study.js", "words.js", "style.css",
  "sw.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"]);
const types = { html: "text/html", js: "text/javascript", css: "text/css",
  webmanifest: "application/manifest+json", png: "image/png" };
const port = Number(process.argv[2] ?? 4173);

createServer(async (request, response) => {
  const name = request.url.split("?")[0].slice(1) || "index.html";
  if (!assets.has(name)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(new URL(name, import.meta.url));
    response.writeHead(200, { "Content-Type": types[name.split(".").at(-1)] }).end(content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, "127.0.0.1", () => console.log(`http://localhost:${port}`));
