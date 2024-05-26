import type { Options as FlowOptions } from '@vxrn/vite-flow';
import type { Hono } from 'hono';
import type { OutputAsset, OutputChunk } from 'rollup';
import type { InlineConfig, UserConfig } from 'vite';
type RollupOutputList = [OutputChunk, ...(OutputChunk | OutputAsset)[]];
export type AfterBuildProps = {
    options: VXRNConfig;
    clientOutput: RollupOutputList;
    serverOutput: RollupOutputList;
    webBuildConfig: UserConfig;
    clientManifest: {
        [key: string]: {
            file: string;
            src?: string;
            isDynamicEntry?: boolean;
            isEntry?: boolean;
            name: string;
            imports: string[];
        };
    };
};
export type VXRNConfig = {
    /**
     * The entry points to your app. For web, it uses your `root` and looks for an index.html
     *
     * Defaults:
     *   native: ./src/entry-native.tsx
     *   server: ./src/entry-server.tsx
     */
    entries?: {
        native?: string;
        server?: string;
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