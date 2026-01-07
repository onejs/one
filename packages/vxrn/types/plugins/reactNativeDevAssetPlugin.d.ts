import type { Plugin } from "vite";
type ReactNativeDevAssetPluginConfig = {
  /** The list file extensions to be treated as assets. Assets are recognized by their extension. */
  assetExts: string[];
  /** Defaults to `'dev'`. */
  mode?: "dev" | "prod";
  /** Only needed while building the release bundle. */
  assetsDest?: string;
};
export declare function reactNativeDevAssetPlugin(options: ReactNativeDevAssetPluginConfig): Plugin;
export {};
//# sourceMappingURL=reactNativeDevAssetPlugin.d.ts.map
