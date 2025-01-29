import { createBetterAuthClient } from '@vxrn/better-auth'
import { clearCurrentUser } from '../state/user'

export const betterAuthClient = createBetterAuthClient()

export const { setAuthClientToken, useAuth, refreshAuth } = betterAuthClient

export const authClient = new Proxy(betterAuthClient.authClient, {
  get(target, key) {
    if (key === 'signOut') {
      return () => {
        // ensure we sync state on signout
        clearCurrentUser()
        betterAuthClient.authClient.signOut()
      }
    }
    return Reflect.get(target, key)
  },
})
