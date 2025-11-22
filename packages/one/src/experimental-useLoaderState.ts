import { useCallback, useEffect, useState } from 'react'
import { useParams, usePathname } from './hooks'
import { resolveHref } from './link/href'
import { getLoaderPath } from './utils/cleanUrl'
import { dynamicImport } from './utils/dynamicImport'

// This is an experimental implementation that doesn't use Suspense
export function experimentalUseLoaderState<Loader extends Function>(loader: Loader) {
  const params = useParams()
  const pathname = usePathname()
  const currentPath = resolveHref({ pathname: pathname, params }).replace(/index$/, '')

  const [data, setData] = useState<any>(null)
  const [state, setState] = useState<'idle' | 'loading'>('loading')
  const [error, setError] = useState<Error | null>(null)

  const fetchLoader = useCallback(
    async (bustCache = false) => {
      setState('loading')
      setError(null)

      try {
        let loaderJSUrl = getLoaderPath(currentPath, true)

        // Add cache busting for refetch
        if (bustCache) {
          loaderJSUrl += `${loaderJSUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`
        }

        const module = await dynamicImport(loaderJSUrl)
        const result = await module.loader()

        setData(result)
        setState('idle')
      } catch (err) {
        console.error('Error loading:', err)
        setError(err as Error)
        setState('idle')
      }
    },
    [currentPath]
  )

  useEffect(() => {
    fetchLoader(false)
  }, [currentPath])

  const refetch = useCallback(() => {
    fetchLoader(true)
  }, [fetchLoader])

  return { data, refetch, state, error }
}
