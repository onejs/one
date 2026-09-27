import type { ProtectedStorePolicy } from '../specs/OneProtectedStore.nitro'

export type { ProtectedStorePolicy }

const unavailable = (): never => {
  throw new Error('ProtectedStore requires an iOS native build')
}

export const ProtectedStore = Object.freeze({
  createItem: (_key: string, _value: string, _policy: ProtectedStorePolicy): Promise<void> => unavailable(),
  getItem: (_key: string, _reason: string, _policy: ProtectedStorePolicy): Promise<string | null> => unavailable(),
  updateItem: (_key: string, _value: string, _reason: string, _policy: ProtectedStorePolicy): Promise<void> => unavailable(),
  deleteItem: (_key: string, _reason: string, _policy: ProtectedStorePolicy): Promise<void> => unavailable(),
})
