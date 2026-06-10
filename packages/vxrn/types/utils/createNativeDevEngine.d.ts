/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */
import type { Plugin } from 'rolldown';
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
export {};
//# sourceMappingURL=createNativeDevEngine.d.ts.map