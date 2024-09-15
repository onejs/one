import { useLayoutEffect, useRef, useState } from 'react'
// @ts-ignore
import type { Query, QueryResultRow, Smash } from 'zql/src/zql/query/query'
// @ts-ignore
import type { Schema } from 'zql/src/zql/query/schema.js'
import { onClientLoaderResolve } from '../clientLoaderResolver'
import { subscribeToZeroQuery } from './subscribeToQuery'
import { resolveZeroQuery } from './resolveQuery'
import { getQueryKey } from './getQueryKey'

let clientInitialData: Object | null = {}

onClientLoaderResolve(() => {
  // TODO remove global
  clientInitialData = globalThis['__vxrnPostRenderData__']
})

// AST_ID => data
const serverQueryData = {}

// TODO remove global
globalThis['__vxrnServerData__'] = serverQueryData

const promises = new WeakMap()

export function useQuery<TSchema extends Schema, TReturn extends Array<QueryResultRow>>(
  query: Query<TSchema, TReturn> | undefined,
  dependencies: readonly unknown[] = [],
  enabled = true
): Smash<TReturn> {
  const [snapshot, setSnapshot] = useState<Smash<TReturn>>()

  const queryIdRef = useRef<string>()
  if (query && !queryIdRef.current) {
    queryIdRef.current = getQueryKey(query)
  }
  const queryId = queryIdRef.current || ''

  // on server use suspense so we wait for it
  if (process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined') {
    if (!query) return []
    const promise = promises.get(query)
    const value = serverQueryData[queryId]
    if (value) return value

    if (!promise) {
      const promise = new Promise<void>((res, rej) => {
        resolveZeroQuery(query)
          .then((val) => {
            serverQueryData[queryId] = val
            res()
          })
          .catch((err) => {
            promises.set(query, null)
            rej(err)
          })
      })
      promises.set(query, promise)
      throw promise
    }

    if (promise) throw promise

    return []
  }

  useLayoutEffect(() => {
    if (!enabled || !query) return

    return subscribeToZeroQuery(query, (val) => {
      setSnapshot(structuredClone(val) as Smash<TReturn>)
    })
  }, dependencies)

  if (clientInitialData && !snapshot) {
    return clientInitialData[queryId] || []
  }

  return snapshot || []
}
