import { assertPreferencesKey, assertPreferencesValue } from './validate'

const unsupported = (): never => {
  throw new Error('Preferences requires an iOS native build')
}

function getItem(key: string): Promise<string | null> {
  assertPreferencesKey(key, 'Preferences.getItem')
  return unsupported()
}

function setItem(key: string, value: string): Promise<void> {
  assertPreferencesKey(key, 'Preferences.setItem')
  assertPreferencesValue(value, 'Preferences.setItem')
  return unsupported()
}

function deleteItem(key: string): Promise<void> {
  assertPreferencesKey(key, 'Preferences.deleteItem')
  return unsupported()
}

function getItemSync(key: string): string | null {
  assertPreferencesKey(key, 'Preferences.getItemSync')
  return unsupported()
}

function setItemSync(key: string, value: string): void {
  assertPreferencesKey(key, 'Preferences.setItemSync')
  assertPreferencesValue(value, 'Preferences.setItemSync')
  return unsupported()
}

function deleteItemSync(key: string): void {
  assertPreferencesKey(key, 'Preferences.deleteItemSync')
  return unsupported()
}

export const Preferences = Object.freeze({
  getItem,
  setItem,
  deleteItem,
  getItemSync,
  setItemSync,
  deleteItemSync,
})
