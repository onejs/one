import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OnePhotoLibrary, PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro'

export type { PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro'

let hybrid: OnePhotoLibrary | undefined

function native(): OnePhotoLibrary {
  if (Platform.OS !== 'ios') throw new Error('PhotoLibrary requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OnePhotoLibrary>('OnePhotoLibrary')
  return hybrid
}

function getAddPermissionStatus(): PhotoLibraryPermissionStatus {
  try {
    return native().getAddPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestAddPermission(): Promise<PhotoLibraryPermissionStatus> {
  return native().requestAddPermission().catch(rethrowNativeError)
}

function saveImage(uri: string): Promise<string> {
  return native().saveImage(uri).catch(rethrowNativeError)
}

function saveVideo(uri: string): Promise<string> {
  return native().saveVideo(uri).catch(rethrowNativeError)
}

export const PhotoLibrary = Object.freeze({
  getAddPermissionStatus,
  requestAddPermission,
  saveImage,
  saveVideo,
})
