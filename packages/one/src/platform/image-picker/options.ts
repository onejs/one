import type {
  ImagePickerMediaType,
  ImagePickerOptions,
  ImagePickerVideoQuality,
} from './types'

// resolved options, the contract the native launchLibrary and launchCamera
// accept. aspect travels as a struct because nitro has no tuples.
export interface ImagePickerCropAspect {
  x: number
  y: number
}

export interface ResolvedImagePickerOptions {
  mediaTypes: ImagePickerMediaType[]
  selectionLimit: number
  allowsEditing: boolean
  aspect?: ImagePickerCropAspect
  quality: number
  videoMaxDuration: number
  videoQuality: string
}

function resolveMediaTypes(
  mediaTypes: ImagePickerMediaType | ImagePickerMediaType[] | undefined,
  verb: string
): ImagePickerMediaType[] {
  const list = Array.isArray(mediaTypes) ? mediaTypes : [mediaTypes ?? 'images']
  if (list.length === 0) {
    throw new Error(`ImagePicker.${verb}: mediaTypes must list at least one media type`)
  }
  for (const mediaType of list) {
    if (mediaType !== 'images' && mediaType !== 'videos') {
      throw new Error(
        `ImagePicker.${verb}: mediaTypes must be 'images' or 'videos', got '${String(mediaType)}'`
      )
    }
  }
  return [...new Set(list)]
}

function resolveSelectionLimit(selectionLimit: number | undefined, verb: string): number {
  const limit = selectionLimit ?? 1
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(
      `ImagePicker.${verb}: selectionLimit must be a nonnegative integer, got '${String(selectionLimit)}'`
    )
  }
  return limit
}

// normalize and validate options. shared by the native and web entries so
// both reject the same bad input before touching any picker.
export function resolveImagePickerOptions(
  options: ImagePickerOptions = {},
  verb = 'launchLibrary'
): ResolvedImagePickerOptions {
  const mediaTypes = resolveMediaTypes(options.mediaTypes, verb)
  const selectionLimit = resolveSelectionLimit(options.selectionLimit, verb)
  const allowsEditing = options.allowsEditing ?? false
  if (typeof allowsEditing !== 'boolean') {
    throw new Error(`ImagePicker.${verb}: allowsEditing must be a boolean`)
  }
  if (allowsEditing) {
    // the crop UI edits one image: multiple selection and video have no
    // crop frame on both platforms, so both reject here rather than
    // silently skipping the edit on one of them.
    if (selectionLimit !== 1) {
      throw new Error(
        `ImagePicker.${verb}: allowsEditing needs a single pick: set selectionLimit to 1`
      )
    }
    if (mediaTypes.length !== 1 || mediaTypes[0] !== 'images') {
      throw new Error(
        `ImagePicker.${verb}: allowsEditing only supports images: set mediaTypes to 'images'`
      )
    }
  }
  let aspect: ImagePickerCropAspect | undefined
  if (options.aspect !== undefined) {
    const [x, y] = options.aspect
    if (
      !Array.isArray(options.aspect) ||
      options.aspect.length !== 2 ||
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x <= 0 ||
      y <= 0
    ) {
      throw new Error(`ImagePicker.${verb}: aspect must be [x, y] of positive numbers`)
    }
    aspect = { x, y }
  }
  const quality = options.quality ?? 1
  if (typeof quality !== 'number' || Number.isNaN(quality) || quality < 0 || quality > 1) {
    throw new Error(`ImagePicker.${verb}: quality must be a number from 0 to 1`)
  }
  const videoMaxDuration = options.videoMaxDuration ?? 0
  if (
    typeof videoMaxDuration !== 'number' ||
    Number.isNaN(videoMaxDuration) ||
    videoMaxDuration < 0
  ) {
    throw new Error(`ImagePicker.${verb}: videoMaxDuration must be a nonnegative number`)
  }
  const videoQuality: ImagePickerVideoQuality = options.videoQuality ?? 'high'
  if (videoQuality !== 'high' && videoQuality !== 'medium' && videoQuality !== 'low') {
    throw new Error(
      `ImagePicker.${verb}: videoQuality must be 'high', 'medium' or 'low', got '${String(options.videoQuality)}'`
    )
  }
  return { mediaTypes, selectionLimit, allowsEditing, aspect, quality, videoMaxDuration, videoQuality }
}

// the camera shares the options shape: it captures one asset, a photo
// unless mediaTypes is videos-only, and honors allowsEditing, quality,
// videoMaxDuration and videoQuality.
export function resolveCameraOptions(
  options: ImagePickerOptions = {}
): ResolvedImagePickerOptions {
  return resolveImagePickerOptions(options, 'launchCamera')
}
