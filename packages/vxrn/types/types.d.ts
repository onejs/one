import type { Options as FlowOptions } from '@vxrn/vite-flow';
import type { Hono } from 'hono';
import type { OutputAsset, OutputChunk } from 'rollup';
import type { InlineConfig, UserConfig } from 'vite';
type RollupOutputList = [OutputChunk, ...(OutputChunk | OutputAsset)[]];
export type BuildArgs = {
    step?: string;
    only?: string;
    analyze?: boolean;
};
export type AfterBuildProps = {
    options: VXRNConfig;
    clientOutput: RollupOutputList;
    serverOutput: RollupOutputList;
    webBuildConfig: UserConfig;
    buildArgs?: BuildArgs;
    clientManifest: {
        [key: string]: ClientManifestEntry;
    };
};
export type ClientManifestEntry = {
    file: string;
    src?: string;
    isDynamicEntry?: boolean;
    isEntry?: boolean;
    name: string;
    imports: string[];
    css?: string[];
};
export type VXRNConfig = {
    /**
     * The entry points to your app. For web, it defaults to using your `root` to look for an index.html
     *
     * Defaults:
     *   native: ./src/entry-native.tsx
     */
    entries?: {
        native?: string;
        web?: string;
    };
    root?: string;
    host?: string;
    port?: number;
    webConfig?: InlineConfig;
    nativeConfig?: InlineConfig;
    flow?: FlowOptions;
    afterBuild?: (props: AfterBuildProps) => void | Promise<void>;
    serve?: (options: VXRNConfig, app: Hono) => void;
};
export type HMRListener = (update: {
    file: string;
    contents: string;
}) => void;
export {};
//# sourceMappingURL=types.d.ts.map