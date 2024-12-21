import { proxy, useSnapshot } from 'valtio'

type SessionState = Record<string, any>

const sessionState = proxy<SessionState>({})

export const useSessionState = () => {
  return useSnapshot(sessionState)
}

export const updateSessionState = (next: Partial<SessionState>) => {
  for (const key in next) {
    sessionState[key] = next[key]
  }
}
