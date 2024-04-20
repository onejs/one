/// <reference types="node" />
import { type UserConfig } from 'vite';
import type { VXRNConfig } from '../types';
import { type VXRNConfigFilled } from '../utils/getOptionsFilled';
export declare const resolveFile: (path: string) => string;
export declare const dev: (optionsIn: VXRNConfig) => Promise<{
    server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    viteServer: import("vite").ViteDevServer;
    start(): Promise<{
        closePromise: Promise<unknown>;
    }>;
    stop: () => Promise<void>;
}>;
export declare function bindKeypressInput(): void;
export declare function getViteServerConfig({ root, host, webConfig, cacheDir }: VXRNConfigFilled): Promise<{
    serverConfig: UserConfig;
    hotUpdateCache: Map<string, string>;
}>;
//# sourceMappingURL=dev.d.ts.map