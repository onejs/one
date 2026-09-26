import type { HybridObject } from 'react-native-nitro-modules'

export type PhotoLibraryPermissionStatus =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'authorized'
  | 'limited'

export interface OnePhotoLibrary extends HybridObject<{ ios: 'swift' }> {
  getAddPermissionStatus(): PhotoLibraryPermissionStatus
  requestAddPermission(): Promise<PhotoLibraryPermissionStatus>
  saveImage(uri: string): Promise<string>
  saveVideo(uri: string): Promise<string>
}
