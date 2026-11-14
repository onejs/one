import type { MaterializedView, QueryError, QueryResultType, ViewListener } from './types';
export declare class NativeView<T> implements MaterializedView<T> {
    data: T;
    private release;
    private report;
    private listeners;
    private active;
    private resultType;
    private error?;
    constructor(data: T, release: () => void, report: (error: unknown) => void);
    addListener(listener: ViewListener<T>): () => void;
    update(data: T, resultType: QueryResultType, error?: QueryError): void;
    destroy(): void;
}
//# sourceMappingURL=view.d.ts.map