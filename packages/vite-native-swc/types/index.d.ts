import { type Output, type ReactConfig } from '@swc/core';
import { type SourceMapPayload } from 'node:module';
import type { PluginOption } from 'vite';
import { type GetBabelConfig } from './transformBabel';
export { configureBabelPlugin, type GetBabelConfig } from './transformBabel';
type Options = {
    mode: 'serve' | 'serve-cjs' | 'build';
    /**
     * Control where the JSX factory is imported from.
     * @default "react"
     */
    jsxImportSource?: string;
    /**
     * Enable TypeScript decorators. Requires experimentalDecorators in tsconfig.
     * @default false
     */
    tsDecorators?: boolean;
    /**
     * Use SWC plugins. Enable SWC at build time.
     * @default undefined
     */
    plugins?: [string, Record<string, any>][];
    forceJSX?: boolean;
    noHMR?: boolean;
    production?: boolean;
    /**
     * Allows configuring babel on a per-file basis. By default, One uses SWC for most files in
     * order to speed up compilation. But it falls back to babel for some files - namely:
     *
     *  - if it detects a `react-native-reanimated` symbol, it adds `react-native-reanimated/plugin`
     *  -
     *
     * (id: string, code: string) => boolean | babel.PluginItem[]
     *
     *   Based on the return value:
     *
     *   - true = use default settings
     *   - false = babel never runs
     *   - babel.PluginItem[] = [babel plugin config](https://babeljs.io/docs/plugins)
     *
     *   Or you can pass a function that returns any of the above:
     *
     *   -
     */
    babel?: GetBabelConfig;
};
declare const _default: (optionsIn?: Options) => PluginOption[];
export default _default;
export declare function swcTransform(_id: string, code: string, options: Options): Promise<Output | {
    code: string;
    map: SourceMapPayload;
} | undefined>;
export declare const transformWithOptions: (id: string, code: string, options: Options, reactConfig: ReactConfig) => Promise<Output | undefined>;
export declare const transformForBuild: (id: string, code: string) => Promise<Output | undefined>;
//# sourceMappingURL=index.d.ts.map