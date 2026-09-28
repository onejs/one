import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneKeepAwake } from '../specs/OneKeepAwake.nitro'
import { assertKeepAwakeEnabled } from './validate'

let hybrid: OneKeepAwake | undefined

function native(): OneKeepAwake {
  if (Platform.OS !== 'ios') throw new Error('KeepAwake requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneKeepAwake>('OneKeepAwake')
  return hybrid
}

function isEnabled(): Promise<boolean> {
  return native().isEnabled().catch(rethrowNativeError)
}

function setEnabled(enabled: boolean): Promise<void> {
  assertKeepAwakeEnabled(enabled)
  return native().setEnabled(enabled).catch(rethrowNativeError)
}

export const KeepAwake = Object.freeze({ isEnabled, setEnabled })
