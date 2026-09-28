import type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryAlbum, PhotoLibraryAlbumPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro'

export type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryAlbum, PhotoLibraryAlbumPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus }

const unsupported = (): never => {
  throw new Error('PhotoLibrary requires an iOS native build')
}

export const PhotoLibrary = Object.freeze({
  getAddPermissionStatus: (): PhotoLibraryPermissionStatus => unsupported(),
  requestAddPermission: (): Promise<PhotoLibraryPermissionStatus> => unsupported(),
  getReadPermissionStatus: (): PhotoLibraryPermissionStatus => unsupported(),
  requestReadPermission: (): Promise<PhotoLibraryPermissionStatus> => unsupported(),
  presentLimitedLibraryPicker: (): Promise<string[]> => unsupported(),
  listAssets: (_offset = 0, _limit = 50): Promise<PhotoLibraryAssetPage> => unsupported(),
  getAsset: (_identifier: string): Promise<PhotoLibraryAsset> => unsupported(),
  listAlbums: (_offset = 0, _limit = 50): Promise<PhotoLibraryAlbumPage> => unsupported(),
  getAlbum: (_identifier: string): Promise<PhotoLibraryAlbum> => unsupported(),
  createAlbum: (_title: string): Promise<string> => unsupported(),
  renameAlbum: (_identifier: string, _title: string): Promise<void> => unsupported(),
  listAlbumAssets: (_identifier: string, _offset = 0, _limit = 50): Promise<PhotoLibraryAssetPage> => unsupported(),
  addAssetToAlbum: (_albumIdentifier: string, _assetIdentifier: string): Promise<void> => unsupported(),
  removeAssetFromAlbum: (_albumIdentifier: string, _assetIdentifier: string): Promise<void> => unsupported(),
  deleteAlbum: (_identifier: string): Promise<void> => unsupported(),
  setFavorite: (_identifier: string, _favorite: boolean): Promise<void> => unsupported(),
  deleteAsset: (_identifier: string): Promise<void> => unsupported(),
  replaceImageContent: (_identifier: string, _uri: string): Promise<void> => unsupported(),
  replaceVideoContent: (_identifier: string, _uri: string): Promise<void> => unsupported(),
  revertAssetContent: (_identifier: string): Promise<void> => unsupported(),
  exportOriginalAsset: (_identifier: string, _allowNetwork = false): Promise<string> => unsupported(),
  exportCurrentImage: (_identifier: string, _allowNetwork = false): Promise<string> => unsupported(),
  exportCurrentVideo: (_identifier: string, _allowNetwork = false): Promise<string> => unsupported(),
  saveImage: (_uri: string): Promise<string> => unsupported(),
  saveVideo: (_uri: string): Promise<string> => unsupported(),
})
