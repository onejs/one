import { missingNativeBuild } from '../nativeError'
import type { ProtectedStorePolicy } from '../specs/OneProtectedStore.nitro'

export type { ProtectedStorePolicy }

export const ProtectedStore = Object.freeze({
  createItem: (
    _key: string,
    _value: string,
    _policy: ProtectedStorePolicy
  ): Promise<void> => Promise.reject(missingNativeBuild('ProtectedStore.createItem')),
  getItem: (
    _key: string,
    _reason: string,
    _policy: ProtectedStorePolicy
  ): Promise<string | null> =>
    Promise.reject(missingNativeBuild('ProtectedStore.getItem')),
  updateItem: (
    _key: string,
    _value: string,
    _reason: string,
    _policy: ProtectedStorePolicy
  ): Promise<void> => Promise.reject(missingNativeBuild('ProtectedStore.updateItem')),
  deleteItem: (
    _key: string,
    _reason: string,
    _policy: ProtectedStorePolicy
  ): Promise<void> => Promise.reject(missingNativeBuild('ProtectedStore.deleteItem')),
})
