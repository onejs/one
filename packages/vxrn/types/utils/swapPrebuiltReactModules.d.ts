import type { Plugin } from "vite";
export declare function prebuildReactNativeModules(
  cacheDir: string,
  internal?: {
    mode?: "dev" | "prod";
  },
): Promise<void>;
export declare function swapPrebuiltReactModules(
  cacheDir: string,
  internal: {
    mode: "dev" | "prod";
    platform: "ios" | "android";
  },
): Promise<Plugin>;
//# sourceMappingURL=swapPrebuiltReactModules.d.ts.map
