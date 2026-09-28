import type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro';
export type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus };
export declare const PhotoLibrary: Readonly<{
    getAddPermissionStatus: () => PhotoLibraryPermissionStatus;
    requestAddPermission: () => Promise<PhotoLibraryPermissionStatus>;
    getReadPermissionStatus: () => PhotoLibraryPermissionStatus;
    requestReadPermission: () => Promise<PhotoLibraryPermissionStatus>;
    listAssets: (_offset?: number, _limit?: number) => Promise<PhotoLibraryAssetPage>;
    getAsset: (_identifier: string) => Promise<PhotoLibraryAsset>;
    setFavorite: (_identifier: string, _favorite: boolean) => Promise<void>;
    deleteAsset: (_identifier: string) => Promise<void>;
    exportOriginalAsset: (_identifier: string, _allowNetwork?: boolean) => Promise<string>;
    saveImage: (_uri: string) => Promise<string>;
    saveVideo: (_uri: string) => Promise<string>;
}>;
//# sourceMappingURL=index.d.ts.map