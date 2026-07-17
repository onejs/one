import { BaseNavigationContainer } from '@react-navigation/core'
import { LinkingContext } from '@react-navigation/native'
import * as React from 'react'

// minimal linking context for SSR — tabs needs .options to resolve triggers
const SSR_LINKING_CTX = { options: undefined as any }

export function SSRNavigationContainer({
  initialState,
  theme,
  linking,
  children,
}: {
  initialState: any
  theme: any
  linking?: any
  children: React.ReactNode
}) {
  const linkingCtx = linking ? { options: linking } : SSR_LINKING_CTX
  return (
    <LinkingContext.Provider value={linkingCtx}>
      <BaseNavigationContainer initialState={initialState} theme={theme}>
        {children}
      </BaseNavigationContainer>
    </LinkingContext.Provider>
  )
}
