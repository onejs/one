// the native.app manifest lives in @vxrn/utils so one/native (which cannot
// see vxrn) and vxrn prebuild (which consumes it) share one definition.
export {
  validateNativeApp,
  type NativeAppManifest,
} from '@vxrn/utils/nativeAppManifest'
