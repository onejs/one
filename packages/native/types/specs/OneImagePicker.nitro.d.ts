import type { HybridObject } from 'react-native-nitro-modules';
import type { ResolvedImagePickerOptions } from '../image-picker/options';
import type { ImagePickerAsset } from '../image-picker/types';
export interface ImagePickerNativeResult {
    canceled: boolean;
    assets?: ImagePickerAsset[];
}
export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined';
export interface CameraPermissionResponse {
    status: CameraPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
}
export interface OneImagePicker extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    launchLibrary(options: ResolvedImagePickerOptions): Promise<ImagePickerNativeResult>;
    launchCamera(): Promise<ImagePickerNativeResult>;
    getCameraPermissions(): Promise<CameraPermissionResponse>;
    requestCameraPermissions(): Promise<CameraPermissionResponse>;
}
//# sourceMappingURL=OneImagePicker.nitro.d.ts.map