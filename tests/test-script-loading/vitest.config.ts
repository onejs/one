import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "@vxrn/test/setup",
    retry: 1,
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
