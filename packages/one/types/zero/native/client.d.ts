import type { ClientState, DesiredQuery, Engine, JSONValue, Mutation, Mutators, Query, Schema, Transport } from './types';
export type NativeZeroOptions = {
    engine: Engine;
    schema: Schema;
    mutators: Mutators;
    transport?: Transport;
    onError?: (error: unknown) => void;
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
    constructor(options: NativeZeroOptions);
    private enqueue;
    private synchronize;
    private request;
    private dispatch;
    private query;
    run<T = unknown>(query: Query): Promise<T>;
    state(): Promise<ClientState>;
    pending(): Promise<Mutation[]>;
    private invoke;
    mutate(name: string, args?: JSONValue): Promise<unknown>;
    private applyPull;
    pull(queries?: readonly DesiredQuery[]): Promise<void>;
    push(): Promise<void>;
    subscribe(query: Query, listener: (value: unknown) => void): () => void;
    private report;
    private publish;
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map