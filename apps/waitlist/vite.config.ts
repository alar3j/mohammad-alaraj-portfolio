import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { thmanyahFonts } from "./build/thmanyah-fonts.ts";

const root = import.meta.dirname;

// Relative base: the built folder works at any path
// (GitHub Pages /mohammad-alaraj-portfolio/waitlist/, a custom domain, Netlify...).
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    // Official Thmanyah .otf files go in fonts-private/ (git-ignored). See build/thmanyah-fonts.ts.
    thmanyahFonts(resolve(root, "fonts-private"), [
      { family: "Thmanyah Sans", weight: 400 },
      { family: "Thmanyah Sans", weight: 700 },
      { family: "Thmanyah Sans", weight: 900 },
      { family: "Thmanyah Serif Display", weight: 700 },
    ]),
  ],
  resolve: { alias: { "@": resolve(root, "src") } },
  build: {
    outDir: resolve(root, "../../waitlist"),
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      input: { main: resolve(root, "index.html"), admin: resolve(root, "admin.html") },
    },
  },
});
