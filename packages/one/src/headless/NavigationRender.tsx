'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { NavigationRenderWebCallback } from './types'

const NavigationRenderWebContext = createContext<
  NavigationRenderWebCallback | undefined
>(undefined)

export type NavigationRenderProps = {
  web?: NavigationRenderWebCallback
  children?: ReactNode
}

export function NavigationRender({ web, children }: NavigationRenderProps) {
  if (process.env.TAMAGUI_TARGET !== 'web') {
    return children
  }

  return (
    <NavigationRenderWebContext.Provider value={web}>
      {children}
    </NavigationRenderWebContext.Provider>
  )
}

export function useNavigationRenderWeb() {
  return useContext(NavigationRenderWebContext)
}
