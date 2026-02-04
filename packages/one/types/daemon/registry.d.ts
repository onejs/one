import type { ServerRegistration, RouteBinding, DaemonState } from './types';
export declare function createRegistry(): DaemonState;
export declare function registerServer(state: DaemonState, opts: {
    port: number;
    bundleId: string;
    root: string;
}): ServerRegistration;
export declare function unregisterServer(state: DaemonState, id: string): boolean;
export declare function findServersByBundleId(state: DaemonState, bundleId: string): ServerRegistration[];
export declare function findServerById(state: DaemonState, id: string): ServerRegistration | undefined;
export declare function setRoute(state: DaemonState, key: string, serverId: string): RouteBinding;
export declare function getRoute(state: DaemonState, key: string): RouteBinding | undefined;
export declare function clearRoute(state: DaemonState, key: string): boolean;
export declare function getAllServers(state: DaemonState): ServerRegistration[];
export declare function getAllRoutes(state: DaemonState): RouteBinding[];
export declare function touchServer(state: DaemonState, id: string): boolean;
export declare function getLastActiveServer(state: DaemonState): ServerRegistration | null;
//# sourceMappingURL=registry.d.ts.map