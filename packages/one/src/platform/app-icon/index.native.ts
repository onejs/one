import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneAppIcon } from '../specs/OneAppIcon.nitro'

let hybrid: OneAppIcon | undefined

function native(): OneAppIcon {
  if (Platform.OS !== 'ios') throw new Error('AppIcon requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneAppIcon>('OneAppIcon')
  return hybrid
}

function isSupported(): Promise<boolean> {
  return native().isSupported().catch(rethrowNativeError)
}

function getCurrentName(): Promise<string | undefined> {
  return native().getCurrentName().catch(rethrowNativeError)
}

function setIcon(name?: string): Promise<void> {
  return native().setIcon(name).catch(rethrowNativeError)
}

export const AppIcon = Object.freeze({ isSupported, getCurrentName, setIcon })
