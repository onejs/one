import { NitroModules } from 'react-native-nitro-modules'
import type { OneAppInfo } from '../specs/OneAppInfo.nitro'
import type { AppInfo as AppInfoApi } from './types'

export type { AppInfoApi }

// synchronous installed-binary identity from the OneAppInfo nitro hybrid
// object. read once at import and frozen: the binary cannot change under a
// running process. a binary without OneAppInfo (an old build) yields all
// nulls, never guessed bundle-time values: after an ota the js bundle and the
// binary disagree, and this snapshot must describe the binary.
function readAppInfo(): AppInfoApi {
  if (!NitroModules.hasHybridObject('OneAppInfo')) {
    return { version: null, build: null, applicationId: null }
  }
  const native = NitroModules.createHybridObject<OneAppInfo>('OneAppInfo')
  return {
    version: native.version ?? null,
    build: native.build ?? null,
    applicationId: native.applicationId ?? null,
  }
}

export const AppInfo: AppInfoApi = Object.freeze(readAppInfo())
