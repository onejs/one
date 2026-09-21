import { TurboModuleRegistry, type TurboModule } from 'react-native'

import { resolveCameraOptions, resolveImagePickerOptions } from './options'
import type {
  ImagePickerOptions,
  ImagePickerPermissionResponse,
  ImagePickerResult,
} from './types'

export type * from './types'

// contract for the OneNativeImagePicker legacy native module. the package's
// codegen covers components only, so the module stays legacy and is resolved
// through the generic TurboModuleRegistry.get, which falls back to it.
interface ImagePickerSpec extends TurboModule {
  launchLibrary(options: {
    mediaTypes: string[]
    selectionLimit: number
  }): Promise<ImagePickerResult>
  launchCamera(): Promise<ImagePickerResult>
  getCameraPermissions(): Promise<ImagePickerPermissionResponse>
  requestCameraPermissions(): Promise<ImagePickerPermissionResponse>
}

// the native module is resolved once and lazily. null until the app links
// @vxrn/native, exactly like the other native modules in this package.
let cached: ImagePickerSpec | null | undefined

function native(verb: string): ImagePickerSpec {
  if (cached === undefined) {
    cached = TurboModuleRegistry.get<ImagePickerSpec>('OneNativeImagePicker')
  }
  if (!cached) {
    throw new Error(
      `ImagePicker.${verb} needs a native build that includes @vxrn/native`
    )
  }
  return cached
}

// present the system photo picker. ios uses PHPickerViewController, which
// needs no permission prompt; android uses the system photo picker with a
// documents fallback on devices without it. picked assets are copied into
// the app cache and returned as file uris. backing out resolves
// { canceled: true, assets: null }. plain, not async, so bad options throw
// synchronously; the one-in-flight slot lives in native.
function launchLibrary(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  const resolved = resolveImagePickerOptions(options)
  return native('launchLibrary').launchLibrary(resolved)
}

// capture one still photo with the system camera. a denied permission, a
// missing camera, and backing out all resolve { canceled: true, assets:
// null }; check getCameraPermissions first when the distinction matters.
// needs the camera permission declared through native.app imagePicker and
// rerun through one prebuild; without it the call rejects.
function launchCamera(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  resolveCameraOptions(options)
  return native('launchCamera').launchCamera()
}

// read the camera permission without prompting. outside the native pending
// slot, so it answers during a pick.
async function getCameraPermissions(): Promise<ImagePickerPermissionResponse> {
  return native('getCameraPermissions').getCameraPermissions()
}

// prompt for the camera permission unless it is already decided.
async function requestCameraPermissions(): Promise<ImagePickerPermissionResponse> {
  return native('requestCameraPermissions').requestCameraPermissions()
}

export const ImagePicker = Object.freeze({
  launchLibrary,
  launchCamera,
  getCameraPermissions,
  requestCameraPermissions,
})
