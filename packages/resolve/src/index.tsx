import module from "node:module";
import { fileURLToPath } from "node:url";

const resolver =
  "resolve" in import.meta
    ? (path: string, from?: string) => fileURLToPath(import.meta.resolve(path, from))
    : "url" in import.meta
      ? (path: string, from?: string) => new URL(path, import.meta.url).pathname
      : require.resolve;

const resolverV2 = (path: string, from = process.cwd()) => {
  const require = module.createRequire(from);
  const importPath = require.resolve(path, { paths: [from] });
  return importPath;
};

export const resolvePath = (path: string, from = process.cwd()): string => {
  // We might be able to use resolverV2 directly, but here we'll still try to use the original implementation first in case there're any issues with the new one.
  try {
    return resolver(path, from);
  } catch (e) {
    return resolverV2(path, from);
  }
};
