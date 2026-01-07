import { type BuildOptions } from "esbuild";
export declare function buildReactJSX(options?: BuildOptions): Promise<void>;
export declare function buildReact(options?: BuildOptions): Promise<void>;
export declare function buildReactNative(
  options: BuildOptions | undefined,
  {
    platform,
    enableExperimentalReactNativeWithReact19Support,
  }: {
    platform: "ios" | "android";
    enableExperimentalReactNativeWithReact19Support?: boolean;
  },
): Promise<void>;
export declare const RNExportNames: string[];
export declare const RExports: string[];
//# sourceMappingURL=index.d.ts.map
