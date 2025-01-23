import { AsyncLocalStorage } from 'node:async_hooks'
import { ensureAsyncLocalID } from '../utils/one__ensureAsyncLocalID'

const newContext = new AsyncLocalStorage()
const existing = globalThis['__vxrnrequestAsyncLocalStore'] as typeof newContext
export const requestAsyncLocalStore = existing ?? newContext

const newCache = new WeakMap<any, Headers>()
export const asyncHeadersCache =
  (globalThis['__vxrnasyncHeadersCache'] as typeof newCache) ?? newCache

// NOTE: we have a big issue right now, we have "one" in optimizeDeps
// because otherwise you get an error when Root imports Text/View from react-native
// even though react-native is in optimizeDeps, it seems thats not working
// but what happens is that somehow one is imported directly by node right away
// and then later its imported through optimizeDeps, a seaprate instance, creating a separate requestAsyncLocalStore
globalThis['__vxrnrequestAsyncLocalStore'] ||= requestAsyncLocalStore
globalThis['__vxrnasyncHeadersCache'] ||= asyncHeadersCache

export async function runWithAsyncLocalContext<A>(cb: (id: Object) => Promise<A>): Promise<A> {
  const id = { _id: Math.random() }
  let out: A = null as any
  await requestAsyncLocalStore.run(id, async () => {
    out = await cb(id)
  })
  return out
}

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
