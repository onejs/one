import { resolveCameraOptions, resolveImagePickerOptions } from './options'
import type {
  ImagePickerAsset,
  ImagePickerOptions,
  ImagePickerPermissionResponse,
  ImagePickerResult,
} from './types'

export type * from './types'

// web entry. the system picker is a file input; signatures stay identical
// to the native entry because the published declarations are built from
// this file and serve both platforms. no browser global is touched at
// import, and on the server every launch behaves as no native side.

const granted: ImagePickerPermissionResponse = Object.freeze({
  status: 'granted',
  granted: true,
  canAskAgain: true,
})

function acceptFor(mediaTypes: string[]): string {
  const accept: string[] = []
  if (mediaTypes.includes('images')) accept.push('image/*')
  if (mediaTypes.includes('videos')) accept.push('video/*')
  return accept.join(',')
}

// a file dialog has no promise: change resolves with files and the cancel
// event resolves with null.
function pickFiles(
  accept: string,
  multiple: boolean,
  capture?: string
): Promise<File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    if (capture) input.capture = capture
    input.onchange = () => resolve(input.files ? [...input.files] : [])
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

async function imageSize(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return { width: 0, height: 0 }
  }
}

function videoSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () =>
      resolve({ width: video.videoWidth, height: video.videoHeight })
    video.onerror = () => resolve({ width: 0, height: 0 })
    video.src = url
  })
}

function videoDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () =>
      resolve(
        Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined
      )
    video.onerror = () => resolve(undefined)
    video.src = url
  })
}

async function toAsset(file: File, quality: number): Promise<ImagePickerAsset> {
  const uri = URL.createObjectURL(file)
  const isVideo = file.type.startsWith('video/')
  const asset: ImagePickerAsset = {
    uri,
    width: 0,
    height: 0,
    mimeType: file.type || undefined,
    fileName: file.name,
    fileSize: file.size,
    type: isVideo ? 'video' : 'image',
  }
  if (isVideo) {
    const url = uri
    const size = await videoSize(url)
    asset.width = size.width
    asset.height = size.height
    const duration = await videoDuration(url)
    if (duration !== undefined) asset.duration = duration
    return asset
  }
  if (quality < 1) {
    const compressed = await compressImage(file, quality)
    if (compressed) {
      URL.revokeObjectURL(uri)
      return compressed
    }
  }
  const size = await imageSize(file)
  asset.width = size.width
  asset.height = size.height
  return asset
}

// recompress an image file to jpeg at the requested quality. null when the
// browser could not decode it, and the caller keeps the original.
async function compressImage(file: File, quality: number): Promise<ImagePickerAsset | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return null
    }
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return null
    const uri = URL.createObjectURL(blob)
    return {
      uri,
      width: canvas.width,
      height: canvas.height,
      mimeType: 'image/jpeg',
      fileName: file.name,
      fileSize: blob.size,
      type: 'image',
    }
  } catch {
    return null
  }
}

async function pick(
  verb: string,
  selectionLimit: number,
  mediaTypes: string[],
  quality: number,
  capture?: string
): Promise<ImagePickerResult> {
  if (typeof document === 'undefined') {
    throw new Error(`ImagePicker.${verb} needs an iOS or Android build`)
  }
  const files = await pickFiles(
    acceptFor(mediaTypes),
    selectionLimit !== 1,
    capture
  )
  if (!files || files.length === 0) return { canceled: true, assets: null }
  const limited = selectionLimit > 0 ? files.slice(0, selectionLimit) : files
  const assets: ImagePickerAsset[] = []
  for (const file of limited) {
    assets.push(await toAsset(file, quality))
  }
  return { canceled: false, assets }
}

// plain, not async, so bad options throw synchronously like the native entry.
// the web file dialog has no crop UI: allowsEditing and aspect validate
// here but change nothing.
function launchLibrary(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const resolved = resolveImagePickerOptions(options)
  return pick('launchLibrary', resolved.selectionLimit, resolved.mediaTypes, resolved.quality)
}

// mobile browsers open the camera for a capture input; desktop browsers
// show the file dialog, the same fallback every expo web app ships. a
// videos-only request captures video where the browser supports it.
function launchCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const resolved = resolveCameraOptions(options)
  // selectionLimit is validated but ignored: the camera captures one asset.
  return pick('launchCamera', 1, resolved.mediaTypes, resolved.quality, 'environment')
}

// the web picker needs no grant, so both permission calls read granted.
async function getCameraPermissions(): Promise<ImagePickerPermissionResponse> {
  return granted
}

async function requestCameraPermissions(): Promise<ImagePickerPermissionResponse> {
  return granted
}

export const ImagePicker = Object.freeze({
  launchLibrary,
  launchCamera,
  getCameraPermissions,
  requestCameraPermissions,
})
