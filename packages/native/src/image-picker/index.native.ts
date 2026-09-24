import { NitroModules } from 'react-native-nitro-modules'
import type { ImagePickerNativeResult, OneImagePicker } from '../specs/OneImagePicker.nitro'
import { rethrowNativeError } from '../nativeError'
import { resolveCameraOptions, resolveImagePickerOptions } from './options'
import type {
  ImagePickerOptions,
  ImagePickerPermissionResponse,
  ImagePickerResult,
} from './types'

export type * from './types'

// the OneImagePicker nitro hybrid object is created once and lazily. null
// until the app links @vxrn/native, exactly like the other native modules in
// this package.
let hybrid: OneImagePicker | null | undefined

function native(verb: string): OneImagePicker {
  if (hybrid === undefined) {
    hybrid = NitroModules.hasHybridObject('OneImagePicker')
      ? NitroModules.createHybridObject<OneImagePicker>('OneImagePicker')
      : null
  }
  if (!hybrid) {
    throw new Error(
      `ImagePicker.${verb} needs a native build that includes @vxrn/native`
    )
  }
  return hybrid
}

// native settles one flat result; assets are set only when not canceled.
function toResult(result: ImagePickerNativeResult): ImagePickerResult {
  if (result.canceled) return { canceled: true, assets: null }
  if (!result.assets) {
    throw new Error('ImagePicker: native returned a pick without assets')
  }
  return { canceled: false, assets: result.assets }
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
  return native('launchLibrary').launchLibrary(resolved).then(toResult, rethrowNativeError)
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
  return native('launchCamera').launchCamera().then(toResult, rethrowNativeError)
}

// read the camera permission without prompting. outside the native pending
// slot, so it answers during a pick.
async function getCameraPermissions(): Promise<ImagePickerPermissionResponse> {
  return native('getCameraPermissions').getCameraPermissions()
}

// prompt for the camera permission unless it is already decided.
async function requestCameraPermissions(): Promise<ImagePickerPermissionResponse> {
  return native('requestCameraPermissions').requestCameraPermissions().catch(rethrowNativeError)
}

export const ImagePicker = Object.freeze({
  launchLibrary,
  launchCamera,
  getCameraPermissions,
  requestCameraPermissions,
})
