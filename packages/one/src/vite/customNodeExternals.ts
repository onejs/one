// forked from https://github.com/Septh/rollup-plugin-node-externals

import { isBuiltin } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

export function nodeExternals(): Plugin {
  return {
    name: `node-externals`,
    enforce: "pre",

    resolveId: {
      order: "pre",
      async handler(specifier, importer, options) {
        // Skip during Vite's dependency optimization scan
        // @see https://github.com/remix-run/remix/discussions/8917
        // @ts-expect-error - scan is not in Vite's types but exists at runtime
        if (options?.scan) return null;

        if (
          options?.isEntry || // Ignore entry points (they should always be resolved)
          /^(?:\0|\.{1,2}\/)/.test(specifier) || // Ignore virtual modules and relative imports
          path.isAbsolute(specifier) // Ignore already resolved ids
        ) {
          return null;
        }
        if (isBuiltin(specifier)) {
          const stripped = specifier.replace(/^node:/, "");
          return {
            id: !isBuiltin(stripped) ? "node:" + stripped : stripped,
            external: true,
            moduleSideEffects: false,
          };
        }
      },
    },
  } as Plugin & { enforce: "pre" | "post" };
}
