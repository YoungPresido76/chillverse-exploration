import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist-pages");
const port = Number(process.env.PORT || 10000);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const candidate = path.resolve(root, `.${requestPath}`);
    const safePath = candidate.startsWith(root + path.sep) || candidate === root;
    const filePath = safePath ? candidate : path.join(root, "index.html");
    let resolvedPath = filePath;

    try {
      const details = await stat(resolvedPath);
      if (details.isDirectory()) resolvedPath = path.join(resolvedPath, "index.html");
    } catch {
      resolvedPath = path.join(root, "index.html");
    }

    await access(resolvedPath);
    response.setHeader("Content-Type", mimeTypes[path.extname(resolvedPath)] || "application/octet-stream");
    createReadStream(resolvedPath).pipe(response);
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Chillverse listening on port ${port}`);
});
