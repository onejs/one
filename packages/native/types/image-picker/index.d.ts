import type { ImagePickerOptions, ImagePickerPermissionResponse, ImagePickerResult } from './types';
export type * from './types';
declare function launchLibrary(options?: ImagePickerOptions): Promise<ImagePickerResult>;
declare function launchCamera(options?: ImagePickerOptions): Promise<ImagePickerResult>;
declare function getCameraPermissions(): Promise<ImagePickerPermissionResponse>;
declare function requestCameraPermissions(): Promise<ImagePickerPermissionResponse>;
export declare const ImagePicker: Readonly<{
    launchLibrary: typeof launchLibrary;
    launchCamera: typeof launchCamera;
    getCameraPermissions: typeof getCameraPermissions;
    requestCameraPermissions: typeof requestCameraPermissions;
}>;
//# sourceMappingURL=index.d.ts.map