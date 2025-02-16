// ⛔️⛔️⛔️⛔️⛔️⛔️
//
// NOTE: we have a big issue right now, we have "one" in optimizeDeps
// because otherwise you get an error when Root imports Text/View from react-native
// even though react-native is in optimizeDeps, it seems thats not working
// but what happens is that somehow one is imported directly by node right away
// and then later its imported through optimizeDeps, a seaprate instance, creating a separate requestAsyncLocalStore

import { AsyncLocalStorage } from 'node:async_hooks'
import { SERVER_CONTEXT_KEY } from '../constants'
import type { One } from './types'

type ALSInstance = AsyncLocalStorage<unknown>

const key = '__vxrnrequestAsyncLocalStore'
const read = () => globalThis[key] as ALSInstance | undefined

const ASYNC_LOCAL_STORE = {
  get current() {
    if (read()) return read()
    const _ = new AsyncLocalStorage()
    globalThis[key] = _
    return _
  },
}

export const requestAsyncLocalStore =
  process.env.VITE_ENVIRONMENT === 'ssr' ? ASYNC_LOCAL_STORE.current : null

const newCache = new WeakMap<any, Headers>()

export const asyncHeadersCache =
  (globalThis['__vxrnasyncHeadersCache'] as typeof newCache) ?? newCache

globalThis['__vxrnasyncHeadersCache'] ||= asyncHeadersCache

export async function runWithAsyncLocalContext<A>(cb: (id: Object) => Promise<A>): Promise<A> {
  const id = { _id: Math.random() }
  let out: A = null as any
  await ASYNC_LOCAL_STORE.current!.run(id, async () => {
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

export function ensureAsyncLocalID() {
  const id = requestAsyncLocalStore?.getStore() ?? { _id: Math.random() }

  if (!id) {
    throw new Error(`Internal One error, no AsyncLocalStorage id!`)
  }

  return id as Object
}

export type MaybeServerContext = null | One.ServerContext

const serverContexts = new WeakMap<any, One.ServerContext>()

export function setServerContext(data: One.ServerContext) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const id = ensureAsyncLocalID()
    if (!serverContexts.has(id)) {
      serverContexts.set(id, {})
    }

    const context = serverContexts.get(id)!
    Object.assign(context, data)
  } else {
    throw new Error(`Don't call setServerContext on client`)
  }
}

export function getServerContext() {
  const out = (() => {
    if (process.env.VITE_ENVIRONMENT === 'ssr') {
      const id = ensureAsyncLocalID()
      return serverContexts.get(id)
    }
    return globalThis[SERVER_CONTEXT_KEY] as MaybeServerContext
  })()

  return out
}

export function useServerContext() {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    try {
      const useContext = globalThis['__vxrnGetContextFromReactContext']
      if (useContext) {
        return serverContexts.get(useContext())
      }
    } catch {
      // ok, not in react tree
    }
  }

  return getServerContext()
}

/**
 * For passing data from the server to the client. Can only be called on the server.
 * You can type it by overriding `One.ClientData` type using declare module 'one'.
 *
 * On the client, you can access the data with `getServerData`.
 */
export function setServerData<Key extends keyof One.ClientData>(
  key: Key,
  value: One.ClientData[Key]
) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const context = getServerContext()
    setServerContext({
      postRenderData: {
        ...context?.postRenderData,
        [key]: value,
      },
    })
  } else {
    throw new Error(`Cannot setServerData in ${process.env.VITE_ENVIRONMENT} environment!`)
  }
}

/**
 * For getting data set by setServerData on the server.
 */
export function getServerData(key: keyof One.ClientData) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    throw new Error(`Cannot getServerData on the server`)
  }
  if (process.env.VITE_ENVIRONMENT !== 'ssr') {
    return getServerContext()?.postRenderData?.[key]
  }
}
