import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The engine lives in the sibling project root's src/ folder (../src from
// here). We import it directly via the @engine alias rather than publishing
// it as a package or restructuring into a monorepo -- this keeps the
// existing CLI/tests/sim entry points at the project root completely
// untouched while letting the web app share the exact same game logic.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@engine": path.resolve(__dirname, "../src"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")],
    },
  },
});
