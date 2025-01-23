import { requestAsyncLocalStore } from '../vite/server'

export function ensureAsyncLocalID() {
  const id = requestAsyncLocalStore?.getStore()

  if (!id) {
    throw new Error(`Internal One error, no AsyncLocalStorage id!`)
  }

  return id as Object
}
