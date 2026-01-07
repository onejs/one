import { mergeConfig, type DepOptimizationConfig, type UserConfig } from "vite";
import { coerceToArray } from "../utils/coerceToArray";
import { uniq } from "../utils/uniq";

type OptimizeDepsConf = {
  include: string[];
  exclude: string[];
  needsInterop: string[];
  esbuildOptions: {
    resolveExtensions: string[];
  };
};

type DepsOptConf = {
  optimizeDeps?: DepOptimizationConfig;
  noExternal?: string | true | RegExp | (string | RegExp)[] | undefined;
};

export function mergeUserConfig(
  optimizeDeps: OptimizeDepsConf,
  serverConfig: UserConfig,
  userViteConfig?: UserConfig | null,
) {
  if (userViteConfig) {
    serverConfig = mergeConfig(serverConfig, userViteConfig) as any;

    // vite doesnt overwrite user css option?
    if (userViteConfig.css) {
      serverConfig.css = userViteConfig.css;
    }

    // noExternal can be true (bundle everything) or an array of strings/RegExp
    if (
      serverConfig.ssr?.noExternal &&
      serverConfig.ssr.noExternal !== true &&
      !Array.isArray(serverConfig.ssr.noExternal)
    ) {
      throw new Error(`ssr.noExternal must be true or an array`);
    }

    // vite doesnt merge arrays but we want that
    // deepMergeOptimizeDeps(serverConfig, userViteConfig, optimizeDeps)

    // TODO move to `server` environment
    serverConfig.ssr ||= {};
    userViteConfig.ssr ||= {};
    deepMergeOptimizeDeps(serverConfig.ssr, userViteConfig.ssr, optimizeDeps);
    deepMergeOptimizeDeps(serverConfig.ssr, userViteConfig, optimizeDeps);
  }

  return serverConfig;
}

export function deepMergeOptimizeDeps(
  a: DepsOptConf,
  b: DepsOptConf,
  extraDepsOpt?: OptimizeDepsConf,
  avoidMergeExternal = false,
) {
  a.optimizeDeps ||= {};
  b.optimizeDeps ||= {};

  if (!avoidMergeExternal) {
    // If either config has noExternal: true, preserve it (means "bundle everything")
    if (a.noExternal === true || b.noExternal === true) {
      a.noExternal = true;
    } else {
      a.noExternal = uniq([
        ...coerceToArray((a.noExternal as string[]) || []),
        ...(a.optimizeDeps.include || []),
        ...(b.optimizeDeps.include || []),
        ...coerceToArray(b.noExternal || []),
        ...(extraDepsOpt?.include || []),

        // TODO at least move to getOptimizeDeps
        "react",
        "react-dom",
        "react-dom/server",
        "react-dom/client",
      ]);
    }
  }

  a.optimizeDeps.exclude = uniq([
    ...(a.optimizeDeps.exclude || []),
    ...(b.optimizeDeps.exclude || []),
    ...(extraDepsOpt?.exclude || []),
  ]);

  a.optimizeDeps.include = uniq([
    ...(a.optimizeDeps.include || []),
    ...(b.optimizeDeps.include || []),
    ...(extraDepsOpt?.include || []),
  ]);

  a.optimizeDeps.needsInterop = uniq([
    ...(a.optimizeDeps.needsInterop || []),
    ...(b.optimizeDeps.needsInterop || []),
    ...(extraDepsOpt?.needsInterop || []),
  ]);

  a.optimizeDeps.esbuildOptions = {
    ...a.optimizeDeps.esbuildOptions,
    ...b.optimizeDeps.esbuildOptions,
    ...extraDepsOpt?.esbuildOptions,
  };
}
