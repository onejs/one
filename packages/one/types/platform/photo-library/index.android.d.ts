export type * from './index.native';
export declare const PhotoLibrary: Readonly<{
    getAddPermissionStatus: () => import("./unavailable").PhotoLibraryPermissionStatus;
    requestAddPermission: () => Promise<import("./unavailable").PhotoLibraryPermissionStatus>;
    getReadPermissionStatus: () => import("./unavailable").PhotoLibraryPermissionStatus;
    requestReadPermission: () => Promise<import("./unavailable").PhotoLibraryPermissionStatus>;
    presentLimitedLibraryPicker: () => Promise<string[]>;
    listAssets: (offset?: number, limit?: number) => Promise<import("./unavailable").PhotoLibraryAssetPage>;
    getAsset: (identifier: string) => Promise<import("./unavailable").PhotoLibraryAsset>;
    listAlbums: (offset?: number, limit?: number) => Promise<import("./unavailable").PhotoLibraryAlbumPage>;
    getAlbum: (identifier: string) => Promise<import("./unavailable").PhotoLibraryAlbum>;
    listAlbumAssets: (identifier: string, offset?: number, limit?: number) => Promise<import("./unavailable").PhotoLibraryAssetPage>;
    setFavorite: (identifier: string, favorite: boolean) => Promise<void>;
    deleteAsset: (identifier: string) => Promise<void>;
    exportOriginalAsset: (identifier: string, allowNetwork?: boolean) => Promise<string>;
    exportCurrentImage: (identifier: string, allowNetwork?: boolean) => Promise<string>;
    exportCurrentVideo: (identifier: string, allowNetwork?: boolean) => Promise<string>;
    saveImage: (uri: string) => Promise<string>;
    saveVideo: (uri: string) => Promise<string>;
    createAlbum: (_title: string) => Promise<string>;
    renameAlbum: (_identifier: string, _title: string) => Promise<void>;
    addAssetToAlbum: (_albumIdentifier: string, _assetIdentifier: string) => Promise<void>;
    removeAssetFromAlbum: (_albumIdentifier: string, _assetIdentifier: string) => Promise<void>;
    deleteAlbum: (_identifier: string) => Promise<void>;
    replaceImageContent: (_identifier: string, _uri: string) => Promise<void>;
    replaceVideoContent: (_identifier: string, _uri: string) => Promise<void>;
    revertAssetContent: (_identifier: string) => Promise<void>;
}>;
//# sourceMappingURL=index.android.d.ts.map