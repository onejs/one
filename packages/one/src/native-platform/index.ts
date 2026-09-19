// zero-expo one foundation lane: adapter and generator mechanisms, root
// selection, manifest, toolchain, and run-command contracts. sdk catalogs,
// generated binding content, cohesive domain semantics, and platform
// implementations belong to the native-domain lane.

export type {
  OneDomainRegistry,
  OneGeneratedRegistry,
  OneNativePlatform,
  OneNativePlatformKey,
  OnePlatformKey,
  OneUIEntries,
} from './platform'
export { assertOneNativePlatform, selectOneNativePlatform } from './platform'

export type {
  OneDeclarationSpec,
  OneGeneratorNamespace,
  OneGeneratorProvenance,
  OneGeneratorSchema,
  OneParameterSpec,
  OneRepresentationChange,
} from './generator'
export {
  checkOneBindingDeterministic,
  emitOneBinding,
  validateOneGeneratorSchema,
  verifyAgainstOfficial,
} from './generator'

export type {
  OneNativeAppAndroidConfig,
  OneNativeAppConfig,
  OneNativeAppIosConfig,
} from './nativeApp'
export { validateNativeApp } from './nativeApp'

export {
  FORBIDDEN_EXPO_PUBLIC_PREFIX,
  FORBIDDEN_EXPO_PLATFORM_KEY,
  ONE_PLATFORM,
  ONE_PLATFORM_VALUES,
  ONE_PUBLIC_PREFIX,
} from './env'
export type { OnePlatformEnvValue } from './env'
export { assertNoExpoPublicEnv, buildOneEnvDefines, isOnePlatformValue } from './env'

export { FORBIDDEN_EXPO_EXACT } from './closure'
export type { OneResolutionEvent, OneResolutionRecorder } from './closure'
export {
  assertDependencyClosure,
  assertNotWorkspaceSource,
  createOneResolutionRecorder,
  isForbiddenExpoSpecifier,
  resolvedDependencyInventory,
} from './closure'
