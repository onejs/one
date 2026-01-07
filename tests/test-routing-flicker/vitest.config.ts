import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "@vxrn/test/setup",
    retry: 1,
    fileParallelism: true,
    testTimeout: 30000,
    hookTimeout: 60000,
    teardownTimeout: 10000,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
