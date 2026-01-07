import type { ResolvedConfig } from "vite";

// For Metro and Expo, we only import types here.
// We use `projectImport` to dynamically import the actual modules
// at runtime to ensure they are loaded from the user's project root.
import type { loadConfig as loadConfigT } from "metro";

import type { TransformOptions } from "@babel/core";

type MetroInputConfig = Parameters<typeof loadConfigT>[1];

export function getMetroBabelConfigFromViteConfig(config: ResolvedConfig): TransformOptions {
  const importMetaEnv = {
    // https://vite.dev/guide/env-and-mode.html#built-in-constants
    MODE: config.mode,
    BASE_URL: "https://vxrn.not.supported.yet",
    PROD: config.mode === "production",
    DEV: config.mode === "development",
    SSR: false,
  };

  // Collect from process.env
  const envPrefix = config.envPrefix || "VITE_";
  if (envPrefix) {
    Object.keys(config.env).forEach((key) => {
      const shouldInclude = Array.isArray(envPrefix)
        ? envPrefix.some((p) => key.startsWith(p))
        : key.startsWith(envPrefix);

      if (shouldInclude) {
        importMetaEnv[key] = process.env[key];
      }
    });
  }

  return {
    plugins: [
      // Note that we can only pass Babel plugins by name here,
      // since Metro will run Babel transformers in different threads
      // and plugins are not serializable, it seems.
      ["@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin", { env: importMetaEnv }],
    ],
  };
}
