import type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro';
export type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus };
declare function getAddPermissionStatus(): PhotoLibraryPermissionStatus;
declare function requestAddPermission(): Promise<PhotoLibraryPermissionStatus>;
declare function getReadPermissionStatus(): PhotoLibraryPermissionStatus;
declare function requestReadPermission(): Promise<PhotoLibraryPermissionStatus>;
declare function listAssets(offset?: number, limit?: number): Promise<PhotoLibraryAssetPage>;
declare function getAsset(identifier: string): Promise<PhotoLibraryAsset>;
declare function saveImage(uri: string): Promise<string>;
declare function saveVideo(uri: string): Promise<string>;
export declare const PhotoLibrary: Readonly<{
    getAddPermissionStatus: typeof getAddPermissionStatus;
    requestAddPermission: typeof requestAddPermission;
    getReadPermissionStatus: typeof getReadPermissionStatus;
    requestReadPermission: typeof requestReadPermission;
    listAssets: typeof listAssets;
    getAsset: typeof getAsset;
    saveImage: typeof saveImage;
    saveVideo: typeof saveVideo;
}>;
//# sourceMappingURL=index.native.d.ts.map