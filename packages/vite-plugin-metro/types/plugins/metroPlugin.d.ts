import type { PluginOption } from 'vite';
import type { loadConfig as loadConfigT } from 'metro';
import type { TransformOptions } from '../transformer/babel-core';
type MetroYargArguments = Parameters<typeof loadConfigT>[0];
type MetroInputConfig = Parameters<typeof loadConfigT>[1];
export type MetroPluginOptions = {
    argv?: MetroYargArguments;
    defaultConfigOverrides?: MetroInputConfig | ((defaultConfig: MetroInputConfig) => MetroInputConfig);
    babelConfig?: TransformOptions;
    /**
     * Overrides the main module name which is normally defined as the `main` field in `package.json`.
     *
     * This will affect how `/.expo/.virtual-metro-entry.bundle` behaves.
     *
     * It can be used to change the entry point of the React Native app without the need of using
     * the `main` field in `package.json`.
     */
    mainModuleName?: string;
};
export declare function metroPlugin(options?: MetroPluginOptions): PluginOption;
export {};
//# sourceMappingURL=metroPlugin.d.ts.map