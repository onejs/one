/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */
import type { Plugin } from 'rolldown';
import type { DevEngine } from 'rolldown/experimental';
/** SWC `env.include` for Hermes-compatible downleveling; see HERMES_CLASS_TRANSFORMS. */
export declare function getHermesSWCIncludes(dev: boolean): string[];
export interface NativePluginContext {
    root: string;
    platform: 'ios' | 'android';
    dev: boolean;
}
interface NativeDevEngineOptions {
    root: string;
    port: number;
    host?: string;
    platform: 'ios' | 'android';
    serverUrl?: string;
    plugins?: Plugin[];
    onHmrUpdate?: (update: NativeHmrUpdate) => void;
}
export type NativeHmrUpdate = {
    type: 'hmr:update';
    clientId: string;
    code: string;
    changedIds: string[];
    seq: number;
} | {
    type: 'hmr:reload';
    clientId?: string;
} | {
    type: 'hmr:error';
};
/**
 * The served dev bundle and the map that resolves a frame in it back to the
 * authored file. `map` is the serialized JSON, parsed only when a symbolicate
 * request arrives.
 */
export interface NativeDevBundle {
    code: string;
    map: string;
}
interface NativeDevEngineResult {
    engine: DevEngine;
    getBundle: () => Promise<NativeDevBundle>;
    getAsset: (pathname: string, hash?: string) => NativeDevAsset | undefined;
    close: () => Promise<void>;
}
export declare function getNativeTransformConfig(platform: 'ios' | 'android', dev: boolean, root: string): {
    jsx: {
        runtime: 'classic';
    };
    define: any;
    inject: {
        React: string;
    };
};
/**
 * Post-process a native bundle to fix rolldown devMode output quirks.
 * Most concerns have been moved to plugins/config:
 * - VXRN_REACT_19 → handled by define in getNativeTransformConfig
 * - DevSettings stripping → stripDevSettingsPlugin
 */
export declare function normalizeNativeCommonJSInterop(code: string): string;
export declare function postProcessNativeBundle(code: string): string;
/**
 * wrap dev module declarations in a function scope. script-level declarations
 * create global properties that can block react native's lazy polyfills.
 * production uses rolldown's iife format; the dev engine needs this wrapper.
 *
 * keep the prelude at script scope because it installs intentional globals.
 * the dev runtime assigns itself to globalThis, and hmr's direct eval stays
 * inside this closure so it can reach module bindings and runtime helpers.
 */
export declare function wrapNativeBundleModuleScope(code: string): string;
export declare function createNativeDevEngine(options: NativeDevEngineOptions): Promise<NativeDevEngineResult>;
interface NativeBuildOptions {
    root: string;
    platform: 'ios' | 'android';
    dev?: boolean;
    serverUrl?: string;
    entryFile?: string;
    assetsDest?: string;
    plugins?: Plugin[];
    /** only pass when the map is written somewhere — it costs a second copy of the bundle */
    sourcemap?: boolean;
    /**
     * Compress and mangle the output. Defaults to React Native's own rule for a
     * bundle: on unless the build is a dev build.
     */
    minify?: boolean;
}
export declare function buildNativeBundle(options: NativeBuildOptions): Promise<{
    code: string;
    map?: string;
}>;
/**
 * Guard NativeAnimatedHelper's createNativeOperations against undefined methods.
 * The methodNames array includes "removeListener" (singular) but the TurboModule
 * spec only has "removeListeners" (plural). The closure calls
 * nullthrows(NativeAnimatedModule)[methodName] which returns undefined, then
 * method(...args) throws "undefined is not a function".
 */
export declare function nativeAnimatedGuardPlugin(): Plugin;
/**
 * alias react-native's Metro HMR client (`Libraries/Utilities/HMRClient`) to a
 * no-op module.
 *
 * vxrn drives Fast Refresh itself over the rolldown-runtime WebSocket and never
 * speaks Metro's `/hot` protocol. On the new architecture, react-native
 * `registerCallableModule('HMRClient', require('./HMRClient'))`s its real client
 * eagerly at startup before vxrn's late override runs, and `emplace` keeps
 * that first registration. RN's client then opens a `MetroHMRClient` socket that
 * receives vxrn's `hmr:*` frames it can't parse and red-boxes
 * `unknown-message [object Object]` on every edit.
 *
 * neutralizing the module at its source means RN registers *this* no-op as the
 * one-and-only `HMRClient` (working with `emplace`, so it's arch-agnostic) and
 * the stray socket is never opened. The class-shaped surface
 * (`setup`/`enable`/`disable`/`registerBundle`/`log`/`isEnabled`) mirrors the
 * methods RN calls on it.
 */
export declare function hmrClientNoopPlugin(): Plugin;
/**
 * Pipe files through @vxrn/compiler's babel transforms.
 * Handles reanimated worklet compilation, async generator downleveling,
 * react-native codegen, react compiler, and react-refresh (dev only) —
 * same pipeline as metro, single babel pass per file.
 */
export declare function vxrnCompilerPlugin(platform: string, dev: boolean, projectRoot?: string, sourceMaps?: boolean): Plugin;
type NativeAssetData = {
    __packager_asset: true;
    name: string;
    type: string;
    scales: number[];
    files: string[];
    httpServerLocation: string;
    fileSystemLocation: string;
    hash: string;
    width?: number;
    height?: number;
};
export type NativeDevAsset = {
    filePath: string;
    hash: string;
    type: string;
};
export declare function createNativeDevAssetRegistry(): {
    register: (asset: NativeAssetData) => void;
    resolve: (pathname: string, hash?: string) => NativeDevAsset | undefined;
};
export declare function getNativeAssetData(id: string, root: string, platform: string): Promise<NativeAssetData>;
/**
 * SWC transform for Hermes compatibility.
 * Lowers classes, lexical bindings, and async syntax for legacy Hermes.
 * Inspired by rollipop's swc-plugin.ts.
 */
export declare function hermesCompatSWCPlugin(dev: boolean, sourceMaps?: boolean): Plugin;
export declare const hermesCompatPlugin: typeof hermesCompatSWCPlugin;
/**
 * Hermes gives a loop one environment, not one per iteration, so every closure
 * created in a loop body sees the binding's final value. zod installs its schema
 * methods with `for (const key in methods) defineProperty(proto, key, {get(){...}})`,
 * and without this every method on every zod schema resolved to the last one:
 * `string().nullish()` called `apply` and the app red-screened at startup.
 * See @vxrn/compiler's transformHermesLoops for the bytecode evidence.
 *
 * Rolldown's own interop helpers are emitted after this runs, but they are
 * already `var`-based with `.bind(null, key)`, so they need no rewriting.
 */
export declare function hermesLoopsPlugin(sourceMaps?: boolean): Plugin;
export declare function getHmrRuntimeSource(): string;
export {};
//# sourceMappingURL=createNativeDevEngine.d.ts.map