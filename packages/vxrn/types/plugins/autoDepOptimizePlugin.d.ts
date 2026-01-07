import { type Plugin } from "vite";
import type { AutoDepOptimizationOptions } from "../types";
import { type ScanDepsResult } from "../utils/scanDepsToOptimize";
type FindDepsOptions = AutoDepOptimizationOptions & {
  root: string;
  onScannedDeps?: (result: ScanDepsResult) => void;
};
export declare function autoDepOptimizePlugin(props: FindDepsOptions): Plugin;
export declare const getSSRExternalsCachePath: (root: string) => string;
type FindDepsOptionsByMode = FindDepsOptions & {
  mode: string;
};
export declare function getScannedOptimizeDepsConfig(props: FindDepsOptionsByMode): Promise<{
  ssr: {
    optimizeDeps: {
      include: string[];
      exclude: string[];
    };
    noExternal: string[];
  };
}>;
export declare function findDepsToOptimize({
  root,
  mode,
  exclude,
  include,
}: FindDepsOptionsByMode): Promise<ScanDepsResult>;
export {};
//# sourceMappingURL=autoDepOptimizePlugin.d.ts.map
