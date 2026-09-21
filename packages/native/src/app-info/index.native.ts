import { TurboModuleRegistry, type TurboModule } from 'react-native'
import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// synchronous installed-binary identity from the OneNativeAppInfo legacy
// constants module. legacy modules arrive through NativeModules with their
// constants merged onto the module object plus a getConstants() accessor
// (NativeModules.js), on both platforms, so the accessor is read directly.
// read once at import and frozen: the binary cannot change under a running
// process. a missing module (old build, or a web bundler resolving the
// native file) yields all nulls, never guessed bundle-time values: after an
// ota the js bundle and the binary disagree, and this snapshot must describe
// the binary.
interface AppInfoSpec extends TurboModule {
  getConstants(): { version: unknown; build: unknown; applicationId: unknown }
}

function readAppInfo(): AppInfoApi {
  const unknown: AppInfoApi = { version: null, build: null, applicationId: null }
  const module = TurboModuleRegistry.get<AppInfoSpec>('OneNativeAppInfo')
  if (!module) return unknown
  const constants = module.getConstants()
  if (!constants || typeof constants !== 'object') return unknown
  const { version, build, applicationId } = constants
  return {
    version: typeof version === 'string' ? version : null,
    build: typeof build === 'string' ? build : null,
    applicationId: typeof applicationId === 'string' ? applicationId : null,
  }
}

export const AppInfo: AppInfoApi = Object.freeze(readAppInfo())
