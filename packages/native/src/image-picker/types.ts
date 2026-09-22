// uniform image picker types. the expo-image-picker module api is the reference
// shape so migration stays mechanical; this is the small subset one supports:
// library options are mediaTypes and selectionLimit, the camera captures one
// photo, and only the camera permission is exposed because neither system
// picker needs a grant.
export type ImagePickerMediaType = 'images' | 'videos'

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
  // (the system maximum). defaults to 1. the camera captures one photo and
  // ignores this.
  selectionLimit?: number
}

// the one permission response shape in the library. platform detail would
// extend it under a platform key; the camera has none.
export type ImagePickerPermissionResponse = Readonly<{
  status: 'granted' | 'denied' | 'undetermined'
  granted: boolean
  canAskAgain: boolean
}>
