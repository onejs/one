import { PhotoLibrary as NativePhotoLibrary } from './index.native'
import { PhotoLibrary as UnavailablePhotoLibrary } from './unavailable'
export type * from './index.native'

// Android implements 17 of 25 methods over MediaStore. Collection
// membership and content edits have no Android equivalent, so those 8
// keep the exact unavailable contract.
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
