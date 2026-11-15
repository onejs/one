import { NitroModules } from 'react-native-nitro-modules'
import type { OneAppInfo } from '../specs/OneAppInfo.nitro'
import type { AppInfo } from './types'

export function readAppInfo(): AppInfo {
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
