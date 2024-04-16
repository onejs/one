import { ExpoRoot, useNavigationContainerRef } from '@vxrn/expo-router'
import { useNavigationContainerRef as b } from '@react-navigation/native'

import { StrictMode, Suspense } from 'react'
import { useRoutes } from './hooks/useRoutes'

// @ts-ignore
export const routes = import.meta.glob('../app/**/*.tsx')

export function App({ path }: { path?: string }) {
  return (
    <StrictMode>
      <Suspense fallback={null}>
        <Router path={path} />
      </Suspense>
    </StrictMode>
  )
}

function Router({ path }: { path?: string }) {
  // idk why this fixes error logging
  return <Test path={path} />
}

function Test({ path }: { path?: string }) {
  const context = useRoutes(routes)

  window['b'] = b()
  console.log('gogo', useNavigationContainerRef(), b())

  console.log('context', context)
  return (
    <ExpoRoot
      location={path ? new URL(`http://localhost:3333${path}`) : undefined}
      context={context}
    />
  )
}
