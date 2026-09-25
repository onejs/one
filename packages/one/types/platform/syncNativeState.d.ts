import { type SyncState } from './syncStore';
export type NativeState<T> = SyncState<T>;
export declare function useNativeState<T>(initial: T): NativeState<T>;
export declare function syncHandleOf<T>(value: T | SyncState<T>): SyncState<T> | null;
export declare function useSyncValue<T>(value: T | SyncState<T>): T;
//# sourceMappingURL=syncNativeState.d.ts.map