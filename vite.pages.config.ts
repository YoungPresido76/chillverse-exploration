import path from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.PAGES_BASE ?? "/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
