import type { BuildOptions } from "esbuild";

import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

export const bundleConstants: Partial<BuildOptions> = {
  bundle: true,
  allowOverwrite: true,
  treeShaking: true,
  minify: true,

  inject: [`${dirname}/inject/react-shim.ts`],

  loader: { ".ts": "ts", ".tsx": "tsx" },
  jsx: "transform",
  legalComments: "none",
};
