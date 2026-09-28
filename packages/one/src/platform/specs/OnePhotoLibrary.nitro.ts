import type { HybridObject } from 'react-native-nitro-modules'

export type PhotoLibraryPermissionStatus =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'authorized'
  | 'limited'

export type PhotoLibraryMediaType = 'image' | 'video' | 'audio' | 'unknown'

export interface PhotoLibraryAsset {
  identifier: string
  mediaType: PhotoLibraryMediaType
  width: number
  height: number
  durationMs: number
  creationDateMs?: number
  isFavorite: boolean
}

export interface PhotoLibraryAssetPage {
  assets: PhotoLibraryAsset[]
  totalCount: number
}

export interface PhotoLibraryAlbum {
  identifier: string
  title: string
}

export interface PhotoLibraryAlbumPage {
  albums: PhotoLibraryAlbum[]
  totalCount: number
}

export interface OnePhotoLibrary extends HybridObject<{ ios: 'swift' }> {
  getAddPermissionStatus(): PhotoLibraryPermissionStatus
  requestAddPermission(): Promise<PhotoLibraryPermissionStatus>
  getReadPermissionStatus(): PhotoLibraryPermissionStatus
  requestReadPermission(): Promise<PhotoLibraryPermissionStatus>
  presentLimitedLibraryPicker(): Promise<string[]>
  listAssets(offset: number, limit: number): Promise<PhotoLibraryAssetPage>
  getAsset(identifier: string): Promise<PhotoLibraryAsset>
  listAlbums(offset: number, limit: number): Promise<PhotoLibraryAlbumPage>
  getAlbum(identifier: string): Promise<PhotoLibraryAlbum>
  createAlbum(title: string): Promise<string>
  renameAlbum(identifier: string, title: string): Promise<void>
  listAlbumAssets(identifier: string, offset: number, limit: number): Promise<PhotoLibraryAssetPage>
  addAssetToAlbum(albumIdentifier: string, assetIdentifier: string): Promise<void>
  removeAssetFromAlbum(albumIdentifier: string, assetIdentifier: string): Promise<void>
  deleteAlbum(identifier: string): Promise<void>
  setFavorite(identifier: string, favorite: boolean): Promise<void>
  deleteAsset(identifier: string): Promise<void>
  exportOriginalAsset(identifier: string, allowNetwork: boolean): Promise<string>
  saveImage(uri: string): Promise<string>
  saveVideo(uri: string): Promise<string>
}
