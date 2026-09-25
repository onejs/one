import type { HybridObject } from 'react-native-nitro-modules'
import type { ResolvedImagePickerOptions } from '../image-picker/options'
import type { ImagePickerAsset } from '../image-picker/types'

// the system photo picker and camera behind One.ImagePicker, matching the
// expo-image-picker subset in ../image-picker/types. a launch settles one flat
// result whose assets are set only when not canceled, which the js entry
// narrows to the public union. one launch is in flight at a time; permission
// reads never take that slot.
export interface ImagePickerNativeResult {
  canceled: boolean
  assets?: ImagePickerAsset[]
}

export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined'

export interface CameraPermissionResponse {
  status: CameraPermissionStatus
  granted: boolean
  canAskAgain: boolean
}

export interface OneImagePicker extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  launchLibrary(options: ResolvedImagePickerOptions): Promise<ImagePickerNativeResult>
  launchCamera(): Promise<ImagePickerNativeResult>
  getCameraPermissions(): Promise<CameraPermissionResponse>
  requestCameraPermissions(): Promise<CameraPermissionResponse>
}
