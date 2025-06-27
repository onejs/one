import type { PluginOption } from 'vite';
import type { loadConfig as loadConfigT } from 'metro';
import type { TransformOptions } from '../transformer/babel-core';
type MetroYargArguments = Parameters<typeof loadConfigT>[0];
type MetroInputConfig = Parameters<typeof loadConfigT>[1];
export type MetroPluginOptions = {
    argv?: MetroYargArguments;
    defaultConfigOverrides?: MetroInputConfig | ((defaultConfig: MetroInputConfig) => MetroInputConfig);
    babelConfig?: TransformOptions;
};
export declare function metroPlugin({ argv, defaultConfigOverrides, babelConfig, }?: MetroPluginOptions): PluginOption;
export {};
//# sourceMappingURL=metroPlugin.d.ts.map