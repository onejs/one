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

// symbol key for storing context directly on the ALS id object (faster than WeakMap)
const _ctxKey = Symbol.for('__oneCtx')

/** shape of the object stored as the ALS context id */
export interface ALSId {
  _id: number
  [_ctxKey]?: One.ServerContext
}

type ALSInstance = AsyncLocalStorage<ALSId>

const key = '__vxrnrequestAsyncLocalStore'
const read = () => globalThis[key] as ALSInstance | undefined

const ASYNC_LOCAL_STORE = {
  get current() {
    if (read()) return read()
    const _ = new AsyncLocalStorage<ALSId>()
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

export async function runWithAsyncLocalContext<A>(
  cb: (id: ALSId) => Promise<A>
): Promise<A> {
  const id: ALSId = { _id: Math.random() }
  let out: A = null as any
  await ASYNC_LOCAL_STORE.current!.run(id, async () => {
    out = await cb(id)
  })
  return out
}

export async function setResponseHeaders(cb: (headers: Headers) => void) {
  const id = ensureAsyncLocalID()
  // read from globalThis to work in bundled middleware where module-level
  // vars may be lazily initialized by the bundler (rolldown __esmMin)
  const cache: WeakMap<any, Headers> =
    globalThis['__vxrnasyncHeadersCache'] ?? asyncHeadersCache
  const headers = cache.get(id) ?? new Headers()
  cache.set(id, headers)
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

const globalId = { _id: Math.random() }

// Store globalId in globalThis to ensure single instance across module duplicates
const GLOBAL_ID_KEY = '__oneGlobalContextId'
if (!globalThis[GLOBAL_ID_KEY]) {
  globalThis[GLOBAL_ID_KEY] = globalId
}

export function ensureAsyncLocalID() {
  // NOTE: this is a hack to get around AsyncLocalStorage.getStore() being undefined on Vercel
  // We don't think there's a need to invoke runWithAsyncLocalContext to handle multiple requests
  // since Vercel ultimately deploys to AWS Lambda, which does not have this issue
  // The Error you willl see is something like this:
  //    Error: Internal One error, no AsyncLocalStorage id! at ensureAsyncLocalID (file:///var/task/server/_virtual_one-entry.js:37411:64)

  // read from globalThis to work in bundled middleware where module-level
  // vars may be lazily initialized by the bundler (rolldown __esmMin)
  const globalIdKey = GLOBAL_ID_KEY || '__oneGlobalContextId'
  const store = requestAsyncLocalStore ?? globalThis['__vxrnrequestAsyncLocalStore']

  const id = process.env.VERCEL ? globalThis[globalIdKey] : store?.getStore()

  if (!id) {
    throw new Error(`Internal One error, no AsyncLocalStorage id!`)
  }

  return id as ALSId
}

export type MaybeServerContext = null | One.ServerContext

// Store serverContexts in globalThis to ensure single instance across module duplicates
const SERVER_CONTEXTS_KEY = '__oneServerContexts'
if (!globalThis[SERVER_CONTEXTS_KEY]) {
  globalThis[SERVER_CONTEXTS_KEY] = new WeakMap<any, One.ServerContext>()
}
const serverContexts = globalThis[SERVER_CONTEXTS_KEY] as WeakMap<any, One.ServerContext>

export function setServerContext(data: One.ServerContext) {
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    const id = ensureAsyncLocalID()
    // fast path: store context directly on the id object to skip WeakMap ops
    let context = id[_ctxKey]
    if (!context) {
      context = {}
      id[_ctxKey] = context
      // also set in WeakMap for backwards compatibility
      serverContexts.set(id, context)
    }
    Object.assign(context, data)
  } else {
    throw new Error(`Don't call setServerContext on client`)
  }
}

export function getServerContext() {
  const out = (() => {
    if (process.env.VITE_ENVIRONMENT === 'ssr') {
      const id = ensureAsyncLocalID()
      // fast path: read from id object directly
      return id[_ctxKey] || serverContexts.get(id)
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
        const id = useContext() as ALSId | null
        if (id) return id[_ctxKey] || serverContexts.get(id)
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
    throw new Error(
      `Cannot setServerData in ${process.env.VITE_ENVIRONMENT} environment!`
    )
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
