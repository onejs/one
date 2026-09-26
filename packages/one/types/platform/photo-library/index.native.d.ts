import type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro';
export type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro';
declare function getAddPermissionStatus(): PhotoLibraryPermissionStatus;
declare function requestAddPermission(): Promise<PhotoLibraryPermissionStatus>;
declare function saveImage(uri: string): Promise<string>;
declare function saveVideo(uri: string): Promise<string>;
export declare const PhotoLibrary: Readonly<{
    getAddPermissionStatus: typeof getAddPermissionStatus;
    requestAddPermission: typeof requestAddPermission;
    saveImage: typeof saveImage;
    saveVideo: typeof saveVideo;
}>;
//# sourceMappingURL=index.native.d.ts.map