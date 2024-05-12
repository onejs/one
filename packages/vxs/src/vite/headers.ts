import { AsyncLocalStorage } from 'node:async_hooks'

export const requestAsyncLocalStore = new AsyncLocalStorage()

export const asyncHeadersCache = new WeakMap<any, Headers>()

// TODO move this to `RequestContext.setHeaders()`

export async function setCurrentRequestHeaders(cb: (headers: Headers) => void) {
  const id = requestAsyncLocalStore.getStore()
  const headers = asyncHeadersCache.get(id) ?? new Headers()
  asyncHeadersCache.set(id, headers)
  cb(headers)
}

export function mergeHeaders(onto: Headers, from: Headers) {
  from.forEach((value, key) => {
    if (onto.has(key)) {
      onto.set(key, value)
    } else {
      onto.append(key, value)
    }
  })
}
