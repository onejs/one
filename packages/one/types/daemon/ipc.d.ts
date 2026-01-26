import * as net from 'node:net';
import type { IPCMessage, IPCResponse, DaemonState } from './types';
export declare function getSocketPath(): string;
export declare function ensureSocketDir(): void;
export declare function cleanupSocket(): void;
export declare function createIPCServer(state: DaemonState, onServerRegistered?: (id: string) => void, onServerUnregistered?: (id: string) => void): net.Server;
export declare function isDaemonRunning(): Promise<boolean>;
export declare function sendIPCMessage(message: IPCMessage): Promise<IPCResponse>;
export declare function registerWithDaemon(opts: {
    port: number;
    bundleId: string;
    root: string;
}): Promise<string>;
export declare function unregisterFromDaemon(id: string): Promise<void>;
export declare function getDaemonStatus(): Promise<{
    servers: {
        id: string;
        port: number;
        bundleId: string;
        root: string;
    }[];
    routes: {
        key: string;
        serverId: string;
    }[];
}>;
export declare function setDaemonRoute(bundleId: string, serverId: string): Promise<void>;
export declare function clearDaemonRoute(bundleId: string): Promise<void>;
//# sourceMappingURL=ipc.d.ts.map