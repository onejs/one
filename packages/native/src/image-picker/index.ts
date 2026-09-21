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

async function toAsset(file: File): Promise<ImagePickerAsset> {
  const uri = URL.createObjectURL(file)
  const isVideo = file.type.startsWith('video/')
  const size = isVideo ? await videoSize(uri) : await imageSize(file)
  return {
    uri,
    width: size.width,
    height: size.height,
    mimeType: file.type || undefined,
    fileName: file.name,
    fileSize: file.size,
  }
}

async function pick(
  verb: string,
  selectionLimit: number,
  mediaTypes: string[],
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
    assets.push(await toAsset(file))
  }
  return { canceled: false, assets }
}

// plain, not async, so bad options throw synchronously like the native entry.
function launchLibrary(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const resolved = resolveImagePickerOptions(options)
  return pick('launchLibrary', resolved.selectionLimit, resolved.mediaTypes)
}

// mobile browsers open the camera for a capture input; desktop browsers
// show the file dialog, the same fallback every expo web app ships.
function launchCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const resolved = resolveCameraOptions(options)
  // selectionLimit is validated but ignored: the camera captures one photo.
  return pick('launchCamera', 1, resolved.mediaTypes, 'environment')
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
