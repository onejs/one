import { useNavigationContainerRef } from '@react-navigation/native'
import { useMemo, useRef } from 'react'
import type { RequireContext } from '../types'
import { store } from './router-store'
import { loadingRoutes } from '../useViteRoutes'

let loadPromise

export function useInitializeExpoRouter(context: RequireContext, initialLocation: URL | undefined) {
  const navigationRef = useNavigationContainerRef()

  useConstant(() => {
    store.initialize(context, navigationRef, initialLocation)
  })

  if (loadPromise) throw loadPromise
  if (loadingRoutes.size) {
    loadPromise = new Promise<void>((res) => {
      Promise.all([...loadingRoutes]).then(() => {
        loadPromise = null
        res()
      })
    })

    throw loadPromise
  }

  return store
}

type ResultBox<T> = { v: T }

export function useConstant<T>(fn: () => T): T {
  const ref = useRef<ResultBox<T>>()
  if (!ref.current) {
    ref.current = { v: fn() }
  }
  return ref.current.v
}
