import { createAuthClient } from 'better-auth/client'
import { Listeners } from '~/helpers/disposable'

export let authClient = createAuthClient()

export const authClientChange = new Listeners<typeof authClient>()

globalThis['authClient'] = authClient

export const setAuthToken = (token: string) => {
  authClient = createAuthClient({
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
  authClientChange.trigger(authClient)
}
