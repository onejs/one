import type { Mode, VXRNOptions } from "../types";
/**
 * **NOTES**
 *
 * * Currently, the `VXRNOptionsFilled` type (which initially is the bag of
 *   command line arguments (`optionsIn`) filled with defaults)
 *   is used throughout the codebase. This makes it difficult to turn `vxrn`
 *   into a pure Vite plugin, because without using the vxrn CLI there will be
 *   no `VXRNOptionsFilled`.
 * * So we plan to gradually phase out `VXRNOptionsFilled`.
 * * The content of `VXRNOptionsFilled` can be divide into two types:
 *   1. Values that can be derived from the Vite config object.
 *   2. Optional settings that are rarely needed.
 *   * For type 1, we will just derive them from the Vite config object. We can
 *     create helper functions like `getSomething(config: ViteResolvedConfig)`
 *     and reuse them across sub-plugins or functions.
 *   * For type 2, we'll avoid referencing VXRNOptionsFilled entirely and
 *     instead pass individual options with sensible defaults.
 * * Current transition strategy:
 *   * To maintain backward compatibility and avoid large-scale refactors at
 *     once, we will still leave most of the `VXRNOptionsFilled` usages there.
 *   * However, we should avoid depending on the full `VXRNOptionsFilled` type.
 *     Instead, we'll use `Pick<...>` and/or `Partial<...>` to narrow the type
 *     to only the properties actually used by each function.
 *   * This makes it easier to use these functions outside of the vxrn CLI by
 *     supplying only the required values.
 *   * Over time, we can progressively eliminate dependencies on
 *     `VXRNOptionsFilled` across the codebase.
 */
export type VXRNOptionsFilled = Awaited<ReturnType<typeof fillOptions>>;
export declare function fillOptions(
  options: VXRNOptions,
  {
    mode,
  }?: {
    mode?: Mode;
  },
): Promise<{
  readonly debugBundlePaths: {
    readonly ios: string;
    readonly android: string;
  };
  readonly mode: "development" | "production";
  readonly clean: false | "vite";
  readonly root: string;
  readonly server: Required<{
    host?: string;
    port?: number;
    compress?: boolean;
    loadEnv?: boolean;
  }> & {
    url: string;
    protocol: string;
  };
  readonly entries: {
    native: string;
    readonly web?: string;
    readonly server: "./src/entry-server.tsx";
  };
  readonly packageJSON: import("pkg-types").PackageJson;
  readonly packageVersions:
    | {
        react: string;
        reactNative: string;
      }
    | undefined;
  readonly state: {
    versionHash?: string;
  };
  readonly packageRootDir: string;
  readonly cacheDir: string;
  readonly build?: {
    server?: boolean | import("..").VXRNBuildOptions;
    analyze?: boolean;
  };
  readonly debugBundle?: string;
  readonly debug?: string;
}>;
export declare function getOptionsFilled(): {
  readonly debugBundlePaths: {
    readonly ios: string;
    readonly android: string;
  };
  readonly mode: "development" | "production";
  readonly clean: false | "vite";
  readonly root: string;
  readonly server: Required<{
    host?: string;
    port?: number;
    compress?: boolean;
    loadEnv?: boolean;
  }> & {
    url: string;
    protocol: string;
  };
  readonly entries: {
    native: string;
    readonly web?: string;
    readonly server: "./src/entry-server.tsx";
  };
  readonly packageJSON: import("pkg-types").PackageJson;
  readonly packageVersions:
    | {
        react: string;
        reactNative: string;
      }
    | undefined;
  readonly state: {
    versionHash?: string;
  };
  readonly packageRootDir: string;
  readonly cacheDir: string;
  readonly build?: {
    server?: boolean | import("..").VXRNBuildOptions;
    analyze?: boolean;
  };
  readonly debugBundle?: string;
  readonly debug?: string;
} | null;
//# sourceMappingURL=getOptionsFilled.d.ts.map
