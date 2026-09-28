import type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus } from '../specs/OnePhotoLibrary.nitro'

export type { PhotoLibraryAsset, PhotoLibraryAssetPage, PhotoLibraryMediaType, PhotoLibraryPermissionStatus }

const unsupported = (): never => {
  throw new Error('PhotoLibrary requires an iOS native build')
}

export const PhotoLibrary = Object.freeze({
  getAddPermissionStatus: (): PhotoLibraryPermissionStatus => unsupported(),
  requestAddPermission: (): Promise<PhotoLibraryPermissionStatus> => unsupported(),
  getReadPermissionStatus: (): PhotoLibraryPermissionStatus => unsupported(),
  requestReadPermission: (): Promise<PhotoLibraryPermissionStatus> => unsupported(),
  listAssets: (_offset = 0, _limit = 50): Promise<PhotoLibraryAssetPage> => unsupported(),
  getAsset: (_identifier: string): Promise<PhotoLibraryAsset> => unsupported(),
  exportOriginalAsset: (_identifier: string, _allowNetwork = false): Promise<string> => unsupported(),
  saveImage: (_uri: string): Promise<string> => unsupported(),
  saveVideo: (_uri: string): Promise<string> => unsupported(),
})
