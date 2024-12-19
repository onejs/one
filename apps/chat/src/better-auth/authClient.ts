import { createAuthClient } from 'better-auth/client'
import { createEmitter } from '~/helpers/emitter'

const keys = {
  token: 'TOKEN_KEY',
  session: 'SESSION_KEY',
}

const existingSession =
  typeof localStorage !== 'undefined' ? localStorage.getItem(keys.session) : ''

export let authClient = existingSession
  ? createAuthClientWithSession(existingSession)
  : createAuthClient()

export const [emit, _, useRefreshAuthClient] = createEmitter<number>()

globalThis['authClient'] = authClient

function createAuthClientWithSession(session: string) {
  return createAuthClient({
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${session}`,
      },
    },
  })
}

export const setAuth = ({ token, session }: { token: string; session: string }) => {
  localStorage.setItem(keys.token, token)
  localStorage.setItem(keys.session, session)
  authClient = createAuthClientWithSession(session)
  emit(Math.random())
}
