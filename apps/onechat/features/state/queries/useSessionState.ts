import { useState } from 'react'
import { createEmitter } from '~/helpers/emitter'

type SessionState = {}

const sessionState: SessionState = {}

const [emitter, useEmitter] = createEmitter<SessionState>()

export const useSessionState = () => {
  const [state, setState] = useState(sessionState)

  useEmitter(setState)

  return state
}

export const updateSessionState = (next: Partial<SessionState>) => {
  Object.assign(sessionState, next)
  emitter.trigger(sessionState)
}
