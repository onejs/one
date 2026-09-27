import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneProtectedStore, ProtectedStorePolicy } from '../specs/OneProtectedStore.nitro'

export type { ProtectedStorePolicy }

let hybrid: OneProtectedStore | undefined

function native(): OneProtectedStore {
  if (Platform.OS !== 'ios') throw new Error('ProtectedStore requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneProtectedStore>('OneProtectedStore')
  return hybrid
}

function createItem(key: string, value: string, policy: ProtectedStorePolicy): Promise<void> {
  return native().createItem(key, value, policy).catch(rethrowNativeError)
}

function getItem(key: string, reason: string, policy: ProtectedStorePolicy): Promise<string | null> {
  return native().getItem(key, reason, policy).then((value) => value ?? null, rethrowNativeError)
}

function updateItem(key: string, value: string, reason: string, policy: ProtectedStorePolicy): Promise<void> {
  return native().updateItem(key, value, reason, policy).catch(rethrowNativeError)
}

function deleteItem(key: string, reason: string, policy: ProtectedStorePolicy): Promise<void> {
  return native().deleteItem(key, reason, policy).catch(rethrowNativeError)
}

export const ProtectedStore = Object.freeze({ createItem, getItem, updateItem, deleteItem })
