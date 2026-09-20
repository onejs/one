// platform-agnostic native build contracts. the executable UI namespaces live
// on the root One export and are implemented by @vxrn/native.
export { validateNativeApp, type NativeAppManifest } from './appManifest'
export {
  ONE_PLATFORM_ENV,
  ONE_PUBLIC_PREFIX,
  assertNoExpoPublicEnv,
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
