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
export declare const PhotoLibrary: Readonly<{
  getAddPermissionStatus: () => PhotoLibraryPermissionStatus
  requestAddPermission: () => Promise<PhotoLibraryPermissionStatus>
  getReadPermissionStatus: () => PhotoLibraryPermissionStatus
  requestReadPermission: () => Promise<PhotoLibraryPermissionStatus>
  presentLimitedLibraryPicker: () => Promise<string[]>
  listAssets: (_offset?: number, _limit?: number) => Promise<PhotoLibraryAssetPage>
  getAsset: (_identifier: string) => Promise<PhotoLibraryAsset>
  listAlbums: (_offset?: number, _limit?: number) => Promise<PhotoLibraryAlbumPage>
  getAlbum: (_identifier: string) => Promise<PhotoLibraryAlbum>
  createAlbum: (_title: string) => Promise<string>
  renameAlbum: (_identifier: string, _title: string) => Promise<void>
  listAlbumAssets: (
    _identifier: string,
    _offset?: number,
    _limit?: number
  ) => Promise<PhotoLibraryAssetPage>
  addAssetToAlbum: (_albumIdentifier: string, _assetIdentifier: string) => Promise<void>
  removeAssetFromAlbum: (
    _albumIdentifier: string,
    _assetIdentifier: string
  ) => Promise<void>
  deleteAlbum: (_identifier: string) => Promise<void>
  setFavorite: (_identifier: string, _favorite: boolean) => Promise<void>
  deleteAsset: (_identifier: string) => Promise<void>
  replaceImageContent: (_identifier: string, _uri: string) => Promise<void>
  replaceVideoContent: (_identifier: string, _uri: string) => Promise<void>
  revertAssetContent: (_identifier: string) => Promise<void>
  exportOriginalAsset: (_identifier: string, _allowNetwork?: boolean) => Promise<string>
  exportCurrentImage: (_identifier: string, _allowNetwork?: boolean) => Promise<string>
  exportCurrentVideo: (_identifier: string, _allowNetwork?: boolean) => Promise<string>
  saveImage: (_uri: string) => Promise<string>
  saveVideo: (_uri: string) => Promise<string>
}>
//# sourceMappingURL=unavailable.d.ts.map
