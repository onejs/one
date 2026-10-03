import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  OnePhotoLibrary, PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryAlbum, PhotoLibraryAlbumPage,
  PhotoLibraryMediaType, PhotoLibraryPermissionStatus,
} from '../specs/OnePhotoLibrary.nitro'

export type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryAlbum, PhotoLibraryAlbumPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus }

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

function presentLimitedLibraryPicker(): Promise<string[]> {
  return native().presentLimitedLibraryPicker().catch(rethrowNativeError)
}

function listAssets(offset = 0, limit = 50): Promise<PhotoLibraryAssetPage> {
  return native().listAssets(offset, limit).catch(rethrowNativeError)
}

function getAsset(identifier: string): Promise<PhotoLibraryAsset> {
  return native().getAsset(identifier).catch(rethrowNativeError)
}

function listAlbums(offset = 0, limit = 50): Promise<PhotoLibraryAlbumPage> {
  return native().listAlbums(offset, limit).catch(rethrowNativeError)
}

function getAlbum(identifier: string): Promise<PhotoLibraryAlbum> {
  return native().getAlbum(identifier).catch(rethrowNativeError)
}

function createAlbum(title: string): Promise<string> {
  return native().createAlbum(title).catch(rethrowNativeError)
}

function renameAlbum(identifier: string, title: string): Promise<void> {
  return native().renameAlbum(identifier, title).catch(rethrowNativeError)
}

function listAlbumAssets(identifier: string, offset = 0, limit = 50): Promise<PhotoLibraryAssetPage> {
  return native().listAlbumAssets(identifier, offset, limit).catch(rethrowNativeError)
}

function addAssetToAlbum(albumIdentifier: string, assetIdentifier: string): Promise<void> {
  return native().addAssetToAlbum(albumIdentifier, assetIdentifier).catch(rethrowNativeError)
}

function removeAssetFromAlbum(albumIdentifier: string, assetIdentifier: string): Promise<void> {
  return native().removeAssetFromAlbum(albumIdentifier, assetIdentifier).catch(rethrowNativeError)
}

function deleteAlbum(identifier: string): Promise<void> {
  return native().deleteAlbum(identifier).catch(rethrowNativeError)
}

function setFavorite(identifier: string, favorite: boolean): Promise<void> {
  return native().setFavorite(identifier, favorite).catch(rethrowNativeError)
}

function deleteAsset(identifier: string): Promise<void> {
  return native().deleteAsset(identifier).catch(rethrowNativeError)
}

function replaceImageContent(identifier: string, uri: string): Promise<void> {
  return native().replaceImageContent(identifier, uri).catch(rethrowNativeError)
}

function replaceVideoContent(identifier: string, uri: string): Promise<void> {
  return native().replaceVideoContent(identifier, uri).catch(rethrowNativeError)
}

function revertAssetContent(identifier: string): Promise<void> {
  return native().revertAssetContent(identifier).catch(rethrowNativeError)
}

function exportOriginalAsset(identifier: string, allowNetwork = false): Promise<string> {
  return native().exportOriginalAsset(identifier, allowNetwork).catch(rethrowNativeError)
}

function exportCurrentImage(identifier: string, allowNetwork = false): Promise<string> {
  return native().exportCurrentImage(identifier, allowNetwork).catch(rethrowNativeError)
}

function exportCurrentVideo(identifier: string, allowNetwork = false): Promise<string> {
  return native().exportCurrentVideo(identifier, allowNetwork).catch(rethrowNativeError)
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
  presentLimitedLibraryPicker,
  listAssets,
  getAsset,
  listAlbums,
  getAlbum,
  createAlbum,
  renameAlbum,
  listAlbumAssets,
  addAssetToAlbum,
  removeAssetFromAlbum,
  deleteAlbum,
  setFavorite,
  deleteAsset,
  replaceImageContent,
  replaceVideoContent,
  revertAssetContent,
  exportOriginalAsset,
  exportCurrentImage,
  exportCurrentVideo,
  saveImage,
  saveVideo,
})
