import { proxy, useSnapshot } from 'valtio'

type SessionState = {
  showHotMenu: boolean | 'from-input'
}

const sessionState = proxy<SessionState>({
  showHotMenu: false,
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
