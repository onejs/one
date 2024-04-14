/// <reference types="node" />
import type { VXRNConfig } from './types';
export declare const resolveFile: (path: string) => string;
export declare const createDevServer: (optionsIn: VXRNConfig) => Promise<{
    nativeServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    viteServer: import("vite").ViteDevServer;
    start(): Promise<{
        closePromise: Promise<unknown>;
    }>;
    stop: () => Promise<void>;
}>;
export declare function bindKeypressInput(): void;
//# sourceMappingURL=createDevServer.d.ts.map