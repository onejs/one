import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/metro-startup-order.test.ts"],
    testTimeout: 90000,
    hookTimeout: 90000,
  },
});
