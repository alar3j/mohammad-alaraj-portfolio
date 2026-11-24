import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

// Relative base: the built folder works at any path
// (GitHub Pages /mohammad-alaraj-portfolio/waitlist/, a custom domain, Netlify...).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
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
