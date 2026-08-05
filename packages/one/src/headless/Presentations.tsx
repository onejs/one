'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { WebPresentations } from './types'

const WebPresentationsContext = createContext<WebPresentations | undefined>(undefined)

export type PresentationsProps = {
  /**
   * components that render `presentation` screens on web. omit one and that
   * presentation keeps rendering its content inline with no chrome.
   */
  web?: WebPresentations
  children?: ReactNode
}

export function Presentations({ web, children }: PresentationsProps) {
  const sheet = web?.sheet
  const modal = web?.modal
  // memo on the components themselves so an inline `web={{ ... }}` object
  // literal doesn't re-render every mounted presentation
  const value = useMemo(
    () => (sheet || modal ? { sheet, modal } : undefined),
    [sheet, modal]
  )

  return (
    <WebPresentationsContext.Provider value={value}>
      {children}
    </WebPresentationsContext.Provider>
  )
}

export function useWebPresentations() {
  return useContext(WebPresentationsContext)
}
