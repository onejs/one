// platform-agnostic native build contracts. the executable UI namespaces live
// on the root One export and are implemented in src/platform.
export {
  expoClientFromNativeApp,
  validateNativeApp,
  type NativeAppManifest,
} from './appManifest'
export {
  ONE_PLATFORM_ENV,
  ONE_PUBLIC_PREFIX,
  pickOnePublicEnv,
  type OnePlatformKey,
} from './env'
