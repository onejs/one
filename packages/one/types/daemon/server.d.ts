import * as http from 'node:http';
export declare function setPendingMapping(serverId: string, simulatorUdid: string): void;
export declare function clearMappingsForSimulator(simulatorUdid: string): void;
export declare function clearAllMappings(): void;
export declare function getSimulatorMappings(): Map<string, string>;
export declare function setSimulatorMapping(simulatorUdid: string, serverId: string): void;
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
    healthCheckInterval: NodeJS.Timeout;
}>;
export {};
//# sourceMappingURL=server.d.ts.map