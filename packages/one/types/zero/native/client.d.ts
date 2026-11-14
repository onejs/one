import type { ClientState, DesiredQuery, Engine, JSONValue, MaterializedView, Mutation, Mutators, Query, Schema, Transport, TTL } from './types';
export type NativeZeroOptions = {
    engine: Engine;
    schema: Schema;
    mutators: Mutators;
    transport?: Transport;
    onError?: (error: unknown) => void;
    context?: unknown;
};
export declare class NativeZero {
    private options;
    private tail;
    private syncTail;
    private closed;
    private closing?;
    private abort;
    private subscriptions;
    private mutators;
    private views;
    private identity?;
    private desiredViews;
    private manualQueries?;
    private managesQueries;
    private queryRefreshQueued;
    constructor(options: NativeZeroOptions);
    private enqueue;
    private synchronize;
    private request;
    private dispatch;
    private query;
    run<T = unknown>(query: Query): Promise<T>;
    get clientID(): string;
    get context(): unknown;
    ready(): Promise<this>;
    state(): Promise<ClientState>;
    pending(): Promise<Mutation[]>;
    private invoke;
    mutate(name: string, args?: JSONValue): Promise<unknown>;
    private applyPull;
    pull(queries?: readonly DesiredQuery[]): Promise<void>;
    push(): Promise<void>;
    subscribe(query: Query, listener: (value: unknown) => void): () => void;
    materialize<T = unknown>(query: Query, options?: {
        hash?: string;
        ttl?: TTL;
    }): MaterializedView<T>;
    private refreshQueries;
    private report;
    private publish;
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map