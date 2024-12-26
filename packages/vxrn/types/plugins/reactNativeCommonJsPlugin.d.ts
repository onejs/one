import { type Plugin } from 'vite';
/**
 * Supporting the ["react-native" community condition](https://nodejs.org/docs/latest-v19.x/api/packages.html#community-conditions-definitions) in dependencies' `package.json`.
 *
 * See:
 * * https://reactnative.dev/blog/2023/06/21/0.72-metro-package-exports-symlinks#package-exports-support-beta
 * * https://v5.vite.dev/config/shared-options.html#resolve-conditions
 */
export declare const conditions: string[];
/**
 * Supporting the "react-native" field in dependencies' `package.json`.
 *
 * For example, with `package.json` like:
 *
 * ```js
 * {
 *   "version": "...",
 *   "name": "...",
 *   "main": "lib/commonjs/index.js",
 *   "module": "lib/module/index.js",
 *   "react-native": "src/index.ts",
 *   "types": "lib/typescript/index.d.ts",
 *   // ...
 * }
 * ```
 *
 * `"react-native": "src/index.ts"` will be used as the entry point instead of `"module": "lib/module/index.js"`.
 *
 * Note that the current (v0.76) React Native has the practice of releasing the source code (which is often in the `src/` folder) directly, and which is often written in TypeScript or JS with Flow types, so that the `@react-native/babel-plugin-codegen` plugin can leverage the type definitions to generate an JS interface for the native code.
 *
 * See:
 * * https://v5.vite.dev/config/shared-options.html#resolve-mainfields
 */
export declare const mainFields: string[];
export declare function reactNativeCommonJsPlugin(options: {
    root: string;
    port: number;
    mode: 'build' | 'serve';
}): Plugin;
//# sourceMappingURL=reactNativeCommonJsPlugin.d.ts.map