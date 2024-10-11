import { type Output, type ReactConfig } from '@swc/core';
import { type SourceMapPayload } from 'node:module';
import type { PluginOption } from 'vite';
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
};
declare const _default: (_options?: Options) => PluginOption[];
export default _default;
export declare function swcTransform(_id: string, code: string, options: Options): Promise<Output | {
    code: string;
    map: SourceMapPayload;
} | undefined>;
export declare const transformWithOptions: (id: string, code: string, options: Options, reactConfig: ReactConfig) => Promise<Output | undefined>;
export declare const transformCommonJs: (id: string, code: string) => Promise<Output | undefined>;
export declare const transformForBuild: (id: string, code: string) => Promise<Output | undefined>;
//# sourceMappingURL=index.d.ts.map