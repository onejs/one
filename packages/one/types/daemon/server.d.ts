import * as http from 'node:http';
import type { DaemonState } from './types';
interface DaemonOptions {
    port?: number;
    host?: string;
    quiet?: boolean;
}
export declare function setRouteMode(mode: 'most-recent' | 'ask' | null): void;
export declare function startDaemon(options?: DaemonOptions): Promise<{
    httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
    ipcServer: import("net").Server;
    state: DaemonState;
    shutdown: () => never;
}>;
export {};
//# sourceMappingURL=server.d.ts.map