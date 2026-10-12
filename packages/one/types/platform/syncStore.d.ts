export declare const SYNC_STATE_ID_KEY: '__one_sync_state_id__';
export declare const SYNC_STATE_BRAND: '__one_sync_state__';
export type SyncStateListener<T> = (value: T) => void;
export type SyncState<T> = {
    value: T;
    get(): T;
    set(value: T): void;
    onChange: SyncStateListener<T> | null;
    subscribe(listener: SyncStateListener<T>): () => void;
    release(): void;
    getSnapshot(): T;
    readonly [SYNC_STATE_BRAND]: true;
    readonly [SYNC_STATE_ID_KEY]: number;
};
export declare function isSyncState(value: unknown): value is SyncState<unknown>;
export declare function getSyncStateId(state: object | null | undefined): number | undefined;
export declare function createSyncState<T>(initial: T): SyncState<T>;
//# sourceMappingURL=syncStore.d.ts.map