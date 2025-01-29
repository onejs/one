import { proxy, useSnapshot } from 'valtio'

/**
 * This file is global ephemeral state, like minor UI elements.
 */

type SessionState = {
  // @bot state here is specific to chat app UI and can be removed for non-chat apps:
  showHotMenu: boolean | 'from-input'
  showPanel: 'user' | 'settings' | null
}

const sessionState = proxy<SessionState>({
  showHotMenu: false,
  showPanel: null,
})

export const useSessionState = () => {
  return useSnapshot(sessionState)
}

export const getSessionState = () => {
  return sessionState
}

export const updateSessionState = (next: Partial<SessionState>) => {
  for (const key in next) {
    // @ts-expect-error
    sessionState[key] = next[key]
  }
}
