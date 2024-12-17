import { useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { createEmitter } from '~/helpers/emitter'

type SessionState = {}

const sessionState = proxy<SessionState>({})

export const useSessionState = () => {
  return useSnapshot(sessionState)
}

export const updateSessionState = (next: Partial<SessionState>) => {
  for (const key in next) {
    sessionState[key] = next[key]
  }
}
