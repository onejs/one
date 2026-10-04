import { PhotoLibrary as NativePhotoLibrary } from './index.native'
import { PhotoLibrary as UnavailablePhotoLibrary } from './unavailable'
export type * from './index.native'

export const PhotoLibrary = Object.freeze({
  ...NativePhotoLibrary,
  createAlbum: UnavailablePhotoLibrary.createAlbum,
  renameAlbum: UnavailablePhotoLibrary.renameAlbum,
  addAssetToAlbum: UnavailablePhotoLibrary.addAssetToAlbum,
  removeAssetFromAlbum: UnavailablePhotoLibrary.removeAssetFromAlbum,
  deleteAlbum: UnavailablePhotoLibrary.deleteAlbum,
  replaceImageContent: UnavailablePhotoLibrary.replaceImageContent,
  replaceVideoContent: UnavailablePhotoLibrary.replaceVideoContent,
  revertAssetContent: UnavailablePhotoLibrary.revertAssetContent,
})
