export interface ServerRegistration {
    id: string;
    port: number;
    bundleId: string;
    root: string;
    registeredAt: number;
    lastActiveAt?: number;
}
export interface RouteBinding {
    key: string;
    serverId: string;
    createdAt: number;
}
export interface DaemonState {
    servers: Map<string, ServerRegistration>;
    routes: Map<string, RouteBinding>;
}
export type IPCMessage = {
    type: 'register';
    port: number;
    bundleId: string;
    root: string;
} | {
    type: 'unregister';
    id: string;
} | {
    type: 'route';
    bundleId: string;
    serverId: string;
} | {
    type: 'route-clear';
    bundleId: string;
} | {
    type: 'status';
} | {
    type: 'ping';
} | {
    type: 'touch';
    id: string;
} | {
    type: 'get-last-active';
};
export type IPCResponse = {
    type: 'registered';
    id: string;
} | {
    type: 'unregistered';
} | {
    type: 'routed';
} | {
    type: 'status';
    servers: ServerRegistration[];
    routes: RouteBinding[];
} | {
    type: 'pong';
} | {
    type: 'touched';
} | {
    type: 'last-active';
    server: ServerRegistration | null;
} | {
    type: 'error';
    message: string;
};
//# sourceMappingURL=types.d.ts.map