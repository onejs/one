import { AsyncLocalStorage } from 'node:async_hooks'
import { ensureAsyncLocalID } from '../utils/one__ensureAsyncLocalID'

export const requestAsyncLocalStore =
  globalThis['__vxrnrequestAsyncLocalStore'] ?? new AsyncLocalStorage()

export const asyncHeadersCache =
  globalThis['__vxrnasyncHeadersCache'] ?? new WeakMap<any, Headers>()

// NOTE: we have a big issue right now, we have "one" in optimizeDeps
// because otherwise you get an error when Root imports Text/View from react-native
// even though react-native is in optimizeDeps, it seems thats not working
// but what happens is that somehow one is imported directly by node right away
// and then later its imported through optimizeDeps, a seaprate instance, creating a separate requestAsyncLocalStore
globalThis['__vxrnrequestAsyncLocalStore'] ||= requestAsyncLocalStore
globalThis['__vxrnasyncHeadersCache'] ||= asyncHeadersCache

export async function setResponseHeaders(cb: (headers: Headers) => void) {
  const id = ensureAsyncLocalID()
  const headers = asyncHeadersCache.get(id) ?? new Headers()
  asyncHeadersCache.set(id, headers)
  cb(headers)
}

export function mergeHeaders(onto: Headers, from: Headers) {
  from.forEach((value, key) => {
    if (value === undefined || value === 'undefined') {
      onto.delete(key)
    } else {
      onto.append(key, value)
    }
  })
}
