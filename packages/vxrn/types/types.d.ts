import type { Hono } from 'hono';
import type { OutputAsset, OutputChunk } from 'rollup';
import type { UserConfig } from 'vite';
type RollupOutputList = [OutputChunk, ...(OutputChunk | OutputAsset)[]];
export type BuildArgs = {
    step?: string;
    only?: string;
    analyze?: boolean;
};
export type AfterBuildProps = {
    options: VXRNOptions;
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
export type VXRNOptions = {
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
    hono?: {
        compression?: boolean;
        cacheHeaders?: 'off';
    };
    root?: string;
    host?: string;
    port?: number;
    /**
     * Uses mkcert to create a self-signed certificate
     */
    https?: boolean;
    /**
     * Whether to clean cache directories on startup
     */
    shouldClean?: boolean;
    afterBuild?: (props: AfterBuildProps) => void | Promise<void>;
    afterServerStart?: (options: VXRNOptions, app: Hono) => void | Promise<void>;
};
export type HMRListener = (update: {
    file: string;
    contents: string;
}) => void;
export {};
//# sourceMappingURL=types.d.ts.map