import { useNavigationContainerRef } from '@react-navigation/native'
import { useRef } from 'react'
import type { RequireContext } from '../types'
import { store } from './router-store'

export function useInitializeExpoRouter(context: RequireContext, initialLocation: URL | undefined) {
  const navigationRef = useNavigationContainerRef()

  useConstant(() => {
    store.initialize(context, navigationRef, initialLocation)
  })

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
