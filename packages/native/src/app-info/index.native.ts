import { TurboModuleRegistry } from 'react-native'
import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// synchronous installed-binary identity from the OneNativeAppInfo legacy
// constants module, which TurboModuleRegistry.get falls back to. legacy
// constants merge onto the module object, hence the dual read, mirroring
// the safe-area module. read once at import and frozen: the binary cannot
// change under a running process. a missing module (old build, or a web
// bundler resolving the native file) yields all nulls, never guessed
// bundle-time values: after an ota the js bundle and the binary disagree,
// and this snapshot must describe the binary.
function readAppInfo(): AppInfoApi {
  const unknown: AppInfoApi = { version: null, build: null, applicationId: null }
  let module: {
    getConstants?: () => unknown
    version?: unknown
    build?: unknown
    applicationId?: unknown
  } | null
  try {
    module = TurboModuleRegistry.get('OneNativeAppInfo') as typeof module
  } catch {
    return unknown
  }
  if (!module) return unknown
  const constants =
    typeof module.getConstants === 'function' ? module.getConstants() : module
  if (!constants || typeof constants !== 'object') return unknown
  const { version, build, applicationId } = constants as Record<string, unknown>
  return {
    version: typeof version === 'string' ? version : null,
    build: typeof build === 'string' ? build : null,
    applicationId: typeof applicationId === 'string' ? applicationId : null,
  }
}

export const AppInfo: AppInfoApi = Object.freeze(readAppInfo())
