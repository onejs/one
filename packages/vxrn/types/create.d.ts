/// <reference types="node" />
import type { VXRNConfig } from './types';
export declare const create: (optionsIn: VXRNConfig) => Promise<{
    nativeServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    viteServer: import("vite").ViteDevServer;
    start(): Promise<{
        closePromise: Promise<unknown>;
    }>;
    stop: () => Promise<void>;
}>;
export declare function bindKeypressInput(): void;
//# sourceMappingURL=create.d.ts.map