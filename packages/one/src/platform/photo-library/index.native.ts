import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  OnePhotoLibrary, PhotoLibraryAsset, PhotoLibraryAssetPage,
  PhotoLibraryMediaType, PhotoLibraryPermissionStatus,
} from '../specs/OnePhotoLibrary.nitro'

export type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus }

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

function getReadPermissionStatus(): PhotoLibraryPermissionStatus {
  try {
    return native().getReadPermissionStatus()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function requestReadPermission(): Promise<PhotoLibraryPermissionStatus> {
  return native().requestReadPermission().catch(rethrowNativeError)
}

function listAssets(offset = 0, limit = 50): Promise<PhotoLibraryAssetPage> {
  return native().listAssets(offset, limit).catch(rethrowNativeError)
}

function getAsset(identifier: string): Promise<PhotoLibraryAsset> {
  return native().getAsset(identifier).catch(rethrowNativeError)
}

function exportOriginalAsset(identifier: string, allowNetwork = false): Promise<string> {
  return native().exportOriginalAsset(identifier, allowNetwork).catch(rethrowNativeError)
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
  getReadPermissionStatus,
  requestReadPermission,
  listAssets,
  getAsset,
  exportOriginalAsset,
  saveImage,
  saveVideo,
})
