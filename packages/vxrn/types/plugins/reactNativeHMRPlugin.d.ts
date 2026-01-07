import { type ResolvedConfig } from "vite";
import type { VXRNOptionsFilled } from "../config/getOptionsFilled";
export declare function reactNativeHMRPlugin({
  assetExts,
  root: rootIn,
  mode: modeIn,
}: Partial<Pick<VXRNOptionsFilled, "root" | "mode">> & {
  assetExts: string[];
}): {
  name: string;
  configResolved(
    this: import("vite").MinimalPluginContextWithoutEnvironment,
    resolvedConfig: ResolvedConfig,
  ): void;
  handleHotUpdate(
    this: import("vite").MinimalPluginContextWithoutEnvironment,
    { read, modules, file, server }: import("vite").HmrContext,
  ): Promise<void>;
};
//# sourceMappingURL=reactNativeHMRPlugin.d.ts.map
