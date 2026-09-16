import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const publicDir = path.resolve("dist-pages");
const assetsDir = path.join(publicDir, "assets");
const files = await readdir(assetsDir);
const js = files.find((file) => /^index-[^/]+\.js$/.test(file));
const css = files.find((file) => /^(?:styles|index)-[^/]+\.css$/.test(file));

if (!js || !css) {
  throw new Error("Could not find the Vite client entry or stylesheet in dist-pages/assets");
}

const source = await readFile("index.html", "utf8");
const html = source
  .replace(/\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/, "")
  .replace(/\s*<script type="module" src="\/src\/static-main\.tsx"><\/script>/, "")
  .replace(
    "</head>",
    `    <link rel="stylesheet" href="/assets/${css}" />\n  </head>`,
  )
  .replace(
    "</body>",
    `    <script type="module" src="/assets/${js}"></script>\n  </body>`,
  );

await writeFile(path.join(publicDir, "index.html"), html);
console.log(`Prepared Render HTML with /assets/${js} and /assets/${css}`);
