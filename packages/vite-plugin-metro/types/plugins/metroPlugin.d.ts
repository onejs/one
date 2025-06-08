import type { PluginOption } from 'vite';
import type { loadConfig as loadConfigT } from 'metro';
import type { TransformOptions } from '../transformer/babel-core';
type MetroYargArguments = Parameters<typeof loadConfigT>[0];
type MetroInputConfig = Parameters<typeof loadConfigT>[1];
export declare function metroPlugin({ argv, defaultConfigOverrides, babelConfig, }?: {
    argv?: MetroYargArguments;
    defaultConfigOverrides?: MetroInputConfig | ((defaultConfig: MetroInputConfig) => MetroInputConfig);
    babelConfig?: TransformOptions;
}): PluginOption;
export {};
//# sourceMappingURL=metroPlugin.d.ts.map