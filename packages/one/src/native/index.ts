// platform-agnostic native build contracts. the executable UI namespaces live
// on the root One export and are implemented by @vxrn/native.
export { validateNativeApp, type NativeAppManifest } from './appManifest'
export {
  ONE_PLATFORM_ENV,
  ONE_PUBLIC_PREFIX,
  pickOnePublicEnv,
  type OnePlatformKey,
} from './env'
