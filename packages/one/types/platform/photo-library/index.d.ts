import type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro';
export type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro';
export declare const PhotoLibrary: Readonly<{
    getAddPermissionStatus: () => PhotoLibraryPermissionStatus;
    requestAddPermission: () => Promise<PhotoLibraryPermissionStatus>;
    saveImage: (_uri: string) => Promise<string>;
    saveVideo: (_uri: string) => Promise<string>;
}>;
//# sourceMappingURL=index.d.ts.map