import type { HybridObject } from 'react-native-nitro-modules';
export type OneUpdatesCheckType = 'available' | 'none';
export type OneUpdatesFetchType = 'fetched' | 'none';
export interface OneUpdatesCheckResult {
    type: OneUpdatesCheckType;
    manifestJson?: string;
}
export interface OneUpdatesFetchResult {
    type: OneUpdatesFetchType;
    manifestJson?: string;
}
export interface OneUpdates extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    readonly isEnabled: boolean;
    readonly runtimeVersion: string | undefined;
    readonly updateId: string | undefined;
    readonly isEmbeddedLaunch: boolean;
    readonly createdAt: string | undefined;
    readonly manifestJson: string | undefined;
    check(): Promise<OneUpdatesCheckResult>;
    fetch(): Promise<OneUpdatesFetchResult>;
    getStagedJson(): string | undefined;
    addStagedListener(listener: (stagedJson: string | undefined) => void): () => void;
    reload(): Promise<void>;
}
//# sourceMappingURL=OneUpdates.nitro.d.ts.map