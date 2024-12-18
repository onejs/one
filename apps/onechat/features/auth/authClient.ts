import { createAuthClient } from 'better-auth/client'
import { createEmitter } from '~/helpers/emitter'

const TOKEN_KEY = 'TOKEN_KEY'

const existingToken = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : ''

export let authClient = existingToken
  ? createAuthClientWithToken(existingToken)
  : createAuthClient()

export const [emit, _, useAuthClientInstanceEmitter] = createEmitter<typeof authClient>()

globalThis['authClient'] = authClient

function createAuthClientWithToken(token: string) {
  return createAuthClient({
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token)
  authClient = createAuthClientWithToken(token)
  emit(authClient)
}
