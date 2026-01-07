import type { Hono } from "hono";
import type { OutputAsset, OutputChunk, TreeshakingOptions, TreeshakingPreset } from "rollup";
import type { FilterPattern, InlineConfig, UserConfig } from "vite";
type RollupOutputList = [OutputChunk, ...(OutputChunk | OutputAsset)[]];
export type Mode = "dev" | "prod";
export type BuildArgs = {
  step?: string;
  only?: string;
  analyze?: boolean;
  platform?: "ios" | "web" | "android";
};
export type AfterBuildProps = {
  options: VXRNOptions;
  clientOutput: RollupOutputList;
  serverOutput: RollupOutputList;
  webBuildConfig: UserConfig;
  serverBuildConfig: UserConfig;
  buildArgs?: BuildArgs;
  clientManifest: {
    [key: string]: ClientManifestEntry;
  };
};
export type AutoDepOptimizationOptions = {
  exclude?: FilterPattern;
  include?: FilterPattern;
};
export type ClientManifestEntry = {
  file: string;
  src?: string;
  isDynamicEntry?: boolean;
  isEntry?: boolean;
  name: string;
  imports: string[];
  css?: string[];
};
export type RollupTreeshakeOptions = boolean | TreeshakingPreset | TreeshakingOptions;
export type VXRNBuildOptions = {
  /**
   * Control the output format of the server build
   * @default esm
   */
  outputFormat?: "cjs" | "esm";
  treeshake?: RollupTreeshakeOptions;
  /**
   * Uses Vite mergeConfig to overwrite any build configuration during build
   */
  config?: InlineConfig;
};
export type VXRNOptions = {
  /**
   * Root directory, your entries.native and entires.web will resolve relative to this
   */
  root?: string;
  /**
   * Whether to bundle for development or production
   */
  mode?: "development" | "production";
  /**
   * The entry points to your app. For web, it defaults to using your `root` to look for an index.html
   *
   * Defaults:
   *   native: ./src/entry-native.tsx
   */
  entries?: {
    native?: string;
    web?: string;
  };
  /**
   * Settings only apply when running `vxrn build`
   */
  build?: {
    /**
     * Can disable web server side build
     * @default true
     */
    server?: boolean | VXRNBuildOptions;
    /**
     * When on, outputs a report.html file with client js bundle analysis
     * @default false
     */
    analyze?: boolean;
  };
  server?: {
    host?: string;
    port?: number;
    compress?: boolean;
    /**
     * Whether to run the Vite logic to load .env files before running the server
     * @default false
     */
    loadEnv?: boolean;
  };
  /**
   * Whether to clean cache directories on startup
   */
  clean?: boolean | "vite";
  /**
   * Will output the bundle to a temp file and then serve it from there afterwards allowing you to easily edit the bundle to debug problems.
   * If set to an empty string it will create a random tmp file and log it to console.
   */
  debugBundle?: string;
  /**
   * Pass debug options to Vite
   */
  debug?: string;
};
export type HMRListener = (update: { file: string; contents: string }) => void;
type VXRNServeOptionsBase = VXRNOptions["server"];
export type VXRNServeOptionsFilled = Required<VXRNServeOptionsBase> & {
  url: string;
  protocol: string;
};
export type VXRNServeOptions = VXRNServeOptionsBase & {
  app?: Hono;
  beforeRegisterRoutes?: (options: VXRNServeOptionsFilled, app: Hono) => void | Promise<void>;
  afterRegisterRoutes?: (options: VXRNServeOptionsFilled, app: Hono) => void | Promise<void>;
};
export {};
//# sourceMappingURL=types.d.ts.map
