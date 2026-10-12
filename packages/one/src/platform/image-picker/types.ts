// uniform image picker types. the expo-image-picker module api is the reference
// shape so migration stays mechanical; this is the subset one supports:
// library options are mediaTypes and selectionLimit, the camera captures one
// photo or, when mediaTypes is videos-only, one video, and only the camera
// permission is exposed because neither system picker needs a grant. crop
// (allowsEditing with an android-only aspect) and camera video follow the
// same expo fields; only still-photo cameras existed before.
export type ImagePickerMediaType = 'images' | 'videos'

export type ImagePickerAssetType = 'image' | 'video'

export type ImagePickerVideoQuality = 'high' | 'medium' | 'low'

export interface ImagePickerAsset {
  // file uri of the picked asset, copied into the app cache
  uri: string
  // pixel dimensions. 0 when the platform did not provide them
  width: number
  height: number
  mimeType?: string
  fileName?: string
  // size in bytes of the cached file
  fileSize?: number
  // video length in milliseconds. absent for images and when the
  // platform did not provide it
  duration?: number
  // the media kind. absent when the platform did not determine one
  type?: ImagePickerAssetType
}

export interface ImagePickerSuccessResult {
  canceled: false
  assets: ImagePickerAsset[]
}

export interface ImagePickerCanceledResult {
  canceled: true
  assets: null
}

export type ImagePickerResult = ImagePickerSuccessResult | ImagePickerCanceledResult

export interface ImagePickerOptions {
  // media kinds to offer. defaults to 'images'
  mediaTypes?: ImagePickerMediaType | ImagePickerMediaType[]
  // maximum number of assets to pick. 1 is a single pick, 0 is unlimited
  // (the system maximum). defaults to 1. the camera captures one asset and
  // ignores this.
  selectionLimit?: number
  // show the crop UI after picking (images only, single pick). on ios the
  // system crop is always square; on android aspect locks the crop frame.
  // mutually exclusive with multiple selection. defaults to false.
  allowsEditing?: boolean
  // [x, y] aspect ratio locking the android crop frame. applies only with
  // allowsEditing; ignored on ios, whose crop is always square.
  aspect?: [number, number]
  // compression quality from 0 to 1. 0 is smallest, 1 is maximum quality.
  // defaults to 1. applies to images only; videos pass through.
  quality?: number
  // maximum camera video length in seconds. 0 disables the limit.
  // defaults to 0. applies to camera video only.
  videoMaxDuration?: number
  // recorded video quality on ios. defaults to 'high'. android passes
  // high through as full quality and anything else as low.
  videoQuality?: ImagePickerVideoQuality
}

// the one permission response shape in the library. platform detail would
// extend it under a platform key; the camera has none.
export type ImagePickerPermissionResponse = Readonly<{
  status: 'granted' | 'denied' | 'undetermined'
  granted: boolean
  canAskAgain: boolean
}>
