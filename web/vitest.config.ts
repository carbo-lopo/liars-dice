import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Tests reuse the app's Vite config, so the @engine alias resolves the same way.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["src/test/setup.ts"],
      restoreMocks: true,
      unstubGlobals: true,
    },
  }),
);
