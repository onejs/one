import { missingNativeBuild } from '../nativeError'
import type {
  PhotoLibraryAsset,
  PhotoLibraryAssetPage,
  PhotoLibraryAlbum,
  PhotoLibraryAlbumPage,
  PhotoLibraryMediaType,
  PhotoLibraryPermissionStatus,
} from '../specs/OnePhotoLibrary.nitro'

export type {
  PhotoLibraryAsset,
  PhotoLibraryAssetPage,
  PhotoLibraryAlbum,
  PhotoLibraryAlbumPage,
  PhotoLibraryMediaType,
  PhotoLibraryPermissionStatus,
}

export const PhotoLibrary = Object.freeze({
  getAddPermissionStatus: (): PhotoLibraryPermissionStatus => 'denied',
  requestAddPermission: (): Promise<PhotoLibraryPermissionStatus> =>
    Promise.resolve('denied'),
  getReadPermissionStatus: (): PhotoLibraryPermissionStatus => 'denied',
  requestReadPermission: (): Promise<PhotoLibraryPermissionStatus> =>
    Promise.resolve('denied'),
  presentLimitedLibraryPicker: (): Promise<string[]> => Promise.resolve([]),
  listAssets: (_offset = 0, _limit = 50): Promise<PhotoLibraryAssetPage> =>
    Promise.resolve({ assets: [], totalCount: 0 }),
  getAsset: (_identifier: string): Promise<PhotoLibraryAsset> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.getAsset')),
  listAlbums: (_offset = 0, _limit = 50): Promise<PhotoLibraryAlbumPage> =>
    Promise.resolve({ albums: [], totalCount: 0 }),
  getAlbum: (_identifier: string): Promise<PhotoLibraryAlbum> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.getAlbum')),
  createAlbum: (_title: string): Promise<string> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.createAlbum')),
  renameAlbum: (_identifier: string, _title: string): Promise<void> => Promise.resolve(),
  listAlbumAssets: (
    _identifier: string,
    _offset = 0,
    _limit = 50
  ): Promise<PhotoLibraryAssetPage> => Promise.resolve({ assets: [], totalCount: 0 }),
  addAssetToAlbum: (_albumIdentifier: string, _assetIdentifier: string): Promise<void> =>
    Promise.resolve(),
  removeAssetFromAlbum: (
    _albumIdentifier: string,
    _assetIdentifier: string
  ): Promise<void> => Promise.resolve(),
  deleteAlbum: (_identifier: string): Promise<void> => Promise.resolve(),
  setFavorite: (_identifier: string, _favorite: boolean): Promise<void> =>
    Promise.resolve(),
  deleteAsset: (_identifier: string): Promise<void> => Promise.resolve(),
  replaceImageContent: (_identifier: string, _uri: string): Promise<void> =>
    Promise.resolve(),
  replaceVideoContent: (_identifier: string, _uri: string): Promise<void> =>
    Promise.resolve(),
  revertAssetContent: (_identifier: string): Promise<void> => Promise.resolve(),
  exportOriginalAsset: (_identifier: string, _allowNetwork = false): Promise<string> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.exportOriginalAsset')),
  exportCurrentImage: (_identifier: string, _allowNetwork = false): Promise<string> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.exportCurrentImage')),
  exportCurrentVideo: (_identifier: string, _allowNetwork = false): Promise<string> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.exportCurrentVideo')),
  saveImage: (_uri: string): Promise<string> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.saveImage')),
  saveVideo: (_uri: string): Promise<string> =>
    Promise.reject(missingNativeBuild('PhotoLibrary.saveVideo')),
})
