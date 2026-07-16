/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */
import type { Plugin } from 'rolldown';
/** SWC `env.include` for Hermes-compatible downleveling; see HERMES_CLASS_TRANSFORMS. */
export declare function getHermesSWCIncludes(dev: boolean): string[];
interface NativeDevEngineOptions {
    root: string;
    port: number;
    host?: string;
    platform: 'ios' | 'android';
    serverUrl?: string;
    plugins?: Plugin[];
    onHmrUpdate?: (update: {
        type: string;
        code?: string;
    }) => void;
}
interface NativeDevEngineResult {
    engine: any;
    getBundle: () => Promise<{
        code: string;
        map?: string;
    }>;
    close: () => Promise<void>;
}
export declare function getNativeTransformConfig(platform: 'ios' | 'android', dev: boolean, root: string): {
    jsx: {
        runtime: "classic";
    };
    define: any;
    inject: {
        React: string;
    };
};
/**
 * Wrap the dev bundle body in a function scope so module top-level
 * `var`/`function` declarations don't leak onto the global object.
 *
 * rolldown's dev() emits the bundle as a *script*. A top-level `var` in a
 * script creates a NON-configurable property on the global object. RN's
 * `Libraries/Network/fetch.js` declares `var ... Headers, Request, ...`, so
 * `global.Headers`/`global.Request` become non-configurable. RN's `setUpXHR`
 * then calls `polyfillGlobal('Headers', ...)`, whose `polyfillObjectProperty`
 * does `Object.defineProperty(global, 'Headers', { configurable: true, ... })`
 * — which throws "Cannot redefine property" and RN converts to
 * `console.error('Failed to set polyfill. Headers is not configurable.')`.
 * In dev that console.error becomes a blocking LogBox redbox, so the app never
 * mounts (every appium navigation then times out). The prod build is immune:
 * its modules are wrapped in closures (no global leak) and it has no LogBox.
 *
 * Wrapping everything after the prelude in an IIFE makes those module vars
 * function-scoped, matching prod, so `polyfillGlobal` succeeds. The prelude
 * stays at script scope because it intentionally installs globals
 * (`globalThis.global`/`__DEV__`/`process`/...). Intentional globals survive:
 * the runtime is assigned via `globalThis.__rolldown_runtime__ = ...`, and HMR
 * updates run through a *direct* `eval` inside this scope, so they still see
 * the closure's `__esmMin`/`__toCommonJS`/module bindings.
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
}
export declare function buildNativeBundle(options: NativeBuildOptions): Promise<{
    code: string;
    map?: string;
}>;
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
export declare function vxrnCompilerPlugin(platform: string, dev: boolean): Plugin;
export {};
//# sourceMappingURL=createNativeDevEngine.d.ts.map