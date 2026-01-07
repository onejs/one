import type { ParserConfig } from "@swc/core";

import { createDebugger } from "@vxrn/utils";

export const { debug } = createDebugger("vxrn:compiler-plugin");

export const runtimePublicPath = "/@react-refresh";

export const asyncGeneratorRegex = /(async \*|async function\*|for await)/;

export const parsers: Record<string, ParserConfig> = {
  ".tsx": { syntax: "typescript", tsx: true, decorators: true },
  ".ts": { syntax: "typescript", tsx: false, decorators: true },
  ".jsx": {
    syntax: "ecmascript",
    jsx: true,
    importAttributes: true,
    explicitResourceManagement: true,
  },
  ".js": { syntax: "ecmascript", importAttributes: true, explicitResourceManagement: true },
  ".mjs": { syntax: "ecmascript", importAttributes: true, explicitResourceManagement: true },
  ".cjs": { syntax: "ecmascript", importAttributes: true, explicitResourceManagement: true },
  ".mdx": {
    syntax: "ecmascript",
    jsx: true,
    importAttributes: true,
    explicitResourceManagement: true,
  },
};

export const validParsers = new Set([...Object.keys(parsers), ".css"]);
