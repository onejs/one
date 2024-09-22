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
    serverResolve: Object;
    webBuildConfig: UserConfig;
    rollupRemoveUnusedImportsPlugin: any;
    serverBuildConfig: UserConfig;
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
export type VXRNBuildOptions = {
    /**
     * Control the output format of the server build
     * @default esm
     */
    outputFormat?: 'cjs' | 'esm';
};
export type VXRNOptions = {
    /**
     * Root directory, your entries.native and entires.web will resolve relative to this
     */
    root?: string;
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
    /**
     * Settings only apply when running `vxrn build`
     */
    build?: {
        /**
         * Can disable web server side build
         * @default true
         */
        server?: boolean | VXRNBuildOptions;
        /**
         * When on, outputs a report.html file with client js bundle analysis
         * @default false
         */
        analyze?: boolean;
    };
    server?: {
        platform?: 'node' | 'vercel';
        host?: string;
        port?: number;
        compression?: boolean;
        cacheHeaders?: 'off';
        /**
         * Uses mkcert to create a self-signed certificate
         */
        https?: boolean;
    };
    /**
     * Whether to clean cache directories on startup
     */
    clean?: boolean;
    afterBuild?: (props: AfterBuildProps) => void | Promise<void>;
    afterServerStart?: (options: VXRNOptions, app: Hono) => void | Promise<void>;
};
export type HMRListener = (update: {
    file: string;
    contents: string;
}) => void;
export {};
//# sourceMappingURL=types.d.ts.map