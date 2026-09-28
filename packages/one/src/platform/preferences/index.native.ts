import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OnePreferences } from '../specs/OnePreferences.nitro'
import { assertPreferencesKey, assertPreferencesValue } from './validate'

let hybrid: OnePreferences | undefined

function native(): OnePreferences {
  if (Platform.OS !== 'ios') throw new Error('Preferences requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OnePreferences>('OnePreferences')
  return hybrid
}

function getItem(key: string): Promise<string | null> {
  assertPreferencesKey(key, 'Preferences.getItem')
  return native().getItem(key).then((value) => value ?? null, rethrowNativeError)
}

function setItem(key: string, value: string): Promise<void> {
  assertPreferencesKey(key, 'Preferences.setItem')
  assertPreferencesValue(value, 'Preferences.setItem')
  return native().setItem(key, value).catch(rethrowNativeError)
}

function deleteItem(key: string): Promise<void> {
  assertPreferencesKey(key, 'Preferences.deleteItem')
  return native().deleteItem(key).catch(rethrowNativeError)
}

function getItemSync(key: string): string | null {
  assertPreferencesKey(key, 'Preferences.getItemSync')
  try {
    return native().getItemSync(key) ?? null
  } catch (error) {
    rethrowNativeError(error)
  }
}

function setItemSync(key: string, value: string): void {
  assertPreferencesKey(key, 'Preferences.setItemSync')
  assertPreferencesValue(value, 'Preferences.setItemSync')
  try {
    native().setItemSync(key, value)
  } catch (error) {
    rethrowNativeError(error)
  }
}

function deleteItemSync(key: string): void {
  assertPreferencesKey(key, 'Preferences.deleteItemSync')
  try {
    native().deleteItemSync(key)
  } catch (error) {
    rethrowNativeError(error)
  }
}

export const Preferences = Object.freeze({
  getItem,
  setItem,
  deleteItem,
  getItemSync,
  setItemSync,
  deleteItemSync,
})
