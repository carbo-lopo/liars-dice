import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The game engine lives in the repository's top-level src/ folder; the web app
// imports it through the @engine alias so both front ends share the same code.
const engineDir = fileURLToPath(new URL("../src", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@engine": engineDir },
  },
  server: {
    fs: { allow: [repoRoot] },
  },
});
