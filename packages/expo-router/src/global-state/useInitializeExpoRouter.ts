import { useNavigationContainerRef } from '@react-navigation/native'
import { useMemo } from 'react'
import type { RequireContext } from '../types'
import { store, useExpoRouter } from './router-store'

export function useInitializeExpoRouter(context: RequireContext, initialLocation: URL | undefined) {
  const navigationRef = useNavigationContainerRef()
  useMemo(
    () => store.initialize(context, navigationRef, initialLocation),
    [context, initialLocation]
  )
  useExpoRouter()
  return store
}
