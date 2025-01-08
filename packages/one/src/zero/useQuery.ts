import { useRef } from 'react'
import { getQueryKey } from './getQueryKey'
import { resolveZeroQuery } from './resolveQuery'
import { useQuery as useQueryZero } from './useQueryZero'
import { getServerContext } from '../utils/serverContext'

let clientInitialData: Object | null = getServerContext()?.postRenderData

// AST_ID => data
const serverQueryData = {}

// TODO remove global
globalThis['__vxrnServerData__'] = serverQueryData

const promises = new WeakMap()

/**
 * This adds server handoff support to useQuery
 */

export const useQuery = ((query: any, enable = true) => {
  const snapshot = useQueryZero(query, enable)

  const queryIdRef = useRef<string>()
  if (query && !queryIdRef.current) {
    queryIdRef.current = getQueryKey(query)
  }
  const queryId = queryIdRef.current || ''

  /**
   * on server use suspense so we wait for it
   */
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

  if (clientInitialData && !snapshot) {
    return clientInitialData[queryId] || []
  }

  return snapshot || []
}) as typeof useQueryZero
