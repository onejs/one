import type {
  ImagePickerMediaType,
  ImagePickerOptions,
} from './types'

// resolved options, the contract the native launchLibrary accepts.
export interface ResolvedImagePickerOptions {
  mediaTypes: ImagePickerMediaType[]
  selectionLimit: number
}

// normalize and validate options. shared by the native and web entries so
// both reject the same bad input before touching any picker.
export function resolveImagePickerOptions(
  options: ImagePickerOptions = {}
): ResolvedImagePickerOptions {
  const { mediaTypes = 'images', selectionLimit = 1 } = options
  const list = Array.isArray(mediaTypes) ? mediaTypes : [mediaTypes]
  if (list.length === 0) {
    throw new Error('ImagePicker mediaTypes must list at least one media type')
  }
  for (const mediaType of list) {
    if (mediaType !== 'images' && mediaType !== 'videos') {
      throw new Error(
        `ImagePicker mediaTypes must be 'images' or 'videos', got '${String(mediaType)}'`
      )
    }
  }
  if (!Number.isInteger(selectionLimit) || selectionLimit < 0) {
    throw new Error(
      `ImagePicker selectionLimit must be a nonnegative integer, got '${String(selectionLimit)}'`
    )
  }
  return { mediaTypes: [...new Set(list)], selectionLimit }
}

// the camera shares the options shape and honors mediaTypes: it captures
// still photos only.
export function resolveCameraOptions(
  options: ImagePickerOptions = {}
): ResolvedImagePickerOptions {
  const resolved = resolveImagePickerOptions(options)
  if (resolved.mediaTypes.includes('videos')) {
    throw new Error('ImagePicker.launchCamera: video capture is not supported')
  }
  return resolved
}

// one image picker request at a time: a second call while a picker, a
// camera capture, or a permission prompt is outstanding is a caller bug and
// throws synchronously instead of queuing behind user input.
export function createRequestGuard(): <T>(
  verb: string,
  run: () => Promise<T>
) => Promise<T> {
  let inFlight = false
  return async (verb, run) => {
    if (inFlight) {
      throw new Error(`ImagePicker.${verb}: another request is already in flight`)
    }
    inFlight = true
    try {
      return await run()
    } finally {
      inFlight = false
    }
  }
}
