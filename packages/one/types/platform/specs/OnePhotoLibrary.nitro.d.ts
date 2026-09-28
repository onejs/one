import type { HybridObject } from 'react-native-nitro-modules';
export type PhotoLibraryPermissionStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized' | 'limited';
export type PhotoLibraryMediaType = 'image' | 'video' | 'audio' | 'unknown';
export interface PhotoLibraryAsset {
    identifier: string;
    mediaType: PhotoLibraryMediaType;
    width: number;
    height: number;
    durationMs: number;
    creationDateMs?: number;
    isFavorite: boolean;
}
export interface PhotoLibraryAssetPage {
    assets: PhotoLibraryAsset[];
    totalCount: number;
}
export interface OnePhotoLibrary extends HybridObject<{
    ios: 'swift';
}> {
    getAddPermissionStatus(): PhotoLibraryPermissionStatus;
    requestAddPermission(): Promise<PhotoLibraryPermissionStatus>;
    getReadPermissionStatus(): PhotoLibraryPermissionStatus;
    requestReadPermission(): Promise<PhotoLibraryPermissionStatus>;
    listAssets(offset: number, limit: number): Promise<PhotoLibraryAssetPage>;
    getAsset(identifier: string): Promise<PhotoLibraryAsset>;
    saveImage(uri: string): Promise<string>;
    saveVideo(uri: string): Promise<string>;
}
//# sourceMappingURL=OnePhotoLibrary.nitro.d.ts.map