export interface UpdateAsset {
    hash: string;
    url: string;
    path: string;
}
export type UpdateMetadataValue = string | number | boolean;
export interface UpdateManifest {
    id: string;
    createdAt: string;
    runtimeVersion: string;
    launchAsset: UpdateAsset;
    assets: UpdateAsset[];
    metadata: Record<string, UpdateMetadataValue>;
}
export type UpdatesCheckResult = {
    type: 'available';
    manifest: UpdateManifest;
} | {
    type: 'none';
};
export type UpdatesFetchResult = {
    type: 'fetched';
    manifest: UpdateManifest;
} | {
    type: 'none';
};
export interface UpdatesStagedSubscription {
    remove(): void;
}
export interface UpdatesApi {
    readonly isEnabled: boolean;
    readonly runtimeVersion: string | null;
    readonly updateId: string | null;
    readonly isEmbeddedLaunch: boolean;
    readonly createdAt: Date | null;
    readonly manifest: UpdateManifest | null;
    check(): Promise<UpdatesCheckResult>;
    fetch(): Promise<UpdatesFetchResult>;
    getStaged(): UpdateManifest | null;
    addStagedListener(listener: (staged: UpdateManifest | null) => void): UpdatesStagedSubscription;
    reload(): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map