import type { MaterializedView, QueryError, QueryResultType, TTL, ViewListener } from './types';
export declare function queryTTL(ttl?: TTL): number;
export declare class NativeView<T> implements MaterializedView<T> {
    data: T;
    private release;
    private report;
    private setTTL;
    private listeners;
    private active;
    private resultType;
    private error?;
    constructor(data: T, release: () => void, report: (error: unknown) => void, setTTL: (ttl: TTL) => void);
    addListener(listener: ViewListener<T>): () => void;
    update(data: T, resultType: QueryResultType, error?: QueryError): void;
    destroy(): void;
    updateTTL(ttl: TTL): void;
}
//# sourceMappingURL=view.d.ts.map