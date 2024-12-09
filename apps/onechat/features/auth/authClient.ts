import { createAuthClient } from 'better-auth/client'
import { createEmitter, Emitter } from '~/helpers/emitter'

export let authClient = createAuthClient()

export const [emitter, useAuthClientInstanceEmitter] = createEmitter<typeof authClient>()

globalThis['authClient'] = authClient

export const setAuthToken = (token: string) => {
  authClient = createAuthClient({
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  emitter.trigger(authClient)
}
