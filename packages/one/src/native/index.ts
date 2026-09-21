// public zero-expo foundation contracts. importable as `one/native` with no
// native implementation installed; every module here is platform-agnostic.
export {
  androidAdapter,
  assertPlatformAdapter,
  definePlatform,
  iosAdapter,
  rnxAdapter,
  selectOneNativePlatform,
  webAdapter,
  type OneNativePlatform,
  type OnePlatformName,
  type PlatformBindingEntry,
  type PlatformBindingRegistry,
} from './platform'
export { validateNativeApp, type NativeAppManifest } from './appManifest'
export {
  EXPO_PLATFORM_ENV,
  EXPO_PUBLIC_PREFIX,
  ONE_PLATFORM_ENV,
  ONE_PUBLIC_PREFIX,
  pickOnePublicEnv,
  type OnePlatformKey,
} from './env'
export {
  FORBIDDEN_EXPO_PATTERN_SOURCES,
  auditUnpackedManifest,
  createResolutionRecorder,
  findForbiddenDependencies,
  isForbiddenExpoSpecifier,
  type ResolutionEvent,
} from './closure'
