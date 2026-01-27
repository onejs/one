import type { PluginObj } from '@babel/core';
type PluginOptions = {
    env?: Record<string, string | boolean | undefined>;
};
/**
 * Babel plugin to replace `import.meta.env.*` and `process.env.*` with env values.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_NATIVE, EXPO_OS, TAMAGUI_ENVIRONMENT)
 * are automatically injected based on the babel caller's platform.
 *
 * This plugin is referenced by name since Metro runs transformers in separate workers:
 * '@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin'
 */
export declare const importMetaEnvPlugin: (api: object, options: PluginOptions | null | undefined, dirname: string) => PluginObj<import("@babel/core").PluginPass>;
export default importMetaEnvPlugin;
//# sourceMappingURL=import-meta-env-plugin.d.ts.map