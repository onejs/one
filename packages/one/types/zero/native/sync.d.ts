export type SyncState = {
    name: 'connecting' | 'connected' | 'disconnected' | 'closed';
} | {
    name: 'error';
    error: unknown;
};
export type SyncOptions = {
    pullIntervalMs?: number;
    retryMinMs?: number;
    retryMaxMs?: number;
    onStateChange?: (state: SyncState) => void;
    subscribeWake?: (request: () => void) => () => void;
};
type SyncClient = {
    push(signal?: AbortSignal): Promise<void>;
    pull(queries: undefined, signal?: AbortSignal): Promise<void>;
};
export declare class NativeSync {
    private client;
    private options;
    private report;
    private stopped;
    private active;
    private online;
    private running;
    private queued;
    private requested;
    private failures;
    private timer?;
    private attempt?;
    private unsubscribeWake?;
    private current;
    private pullInterval;
    private retryMin;
    private retryMax;
    constructor(client: SyncClient, options: SyncOptions, report: (error: unknown) => void);
    get state(): SyncState;
    private setState;
    request(): void;
    setActive(active: boolean): void;
    setOnline(online: boolean): void;
    private connectWake;
    private disconnectWake;
    private changedAvailability;
    private run;
    stop(): void;
}
export {};
//# sourceMappingURL=sync.d.ts.map