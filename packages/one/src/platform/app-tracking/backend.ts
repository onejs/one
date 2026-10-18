import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneAppTracking } from '../specs/OneAppTracking.nitro'

let hybrid: OneAppTracking | undefined

export function appTrackingNative() {
  if (Platform.OS !== 'ios') throw new Error('AppTracking requires an iOS native build')
  return (hybrid ??= NitroModules.createHybridObject<OneAppTracking>('OneAppTracking'))
}
