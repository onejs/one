'use no memo'

import { createBetterAuthClient } from '@o/better-auth-utils'
import { href } from 'one'
import { useMemo } from 'react'
import { SERVER_URL } from '~/constants/urls'
import { showToast } from '~/interface/toast/Toast'
import { plugins } from './plugins'
import type { User } from 'better-auth'
import type { AuthData } from 'on-zero'
type AppUser = User & {
  role?: 'admin'
}
const betterAuthClient = createBetterAuthClient({
  baseURL: SERVER_URL,
  useJWT: true,
  plugins,
  createUser: (user) => user as AppUser,
  onAuthError: (error: any) => {
    showToast(`Auth error: ${error.message || JSON.stringify(error)}`, {
      type: 'error',
    })
  },
})
export const useAuth = () => {
  const auth = betterAuthClient.useAuth()
  const authUserId = auth?.user?.id
  const authUserRole = auth?.user?.role
  const authData = useMemo((): AuthData | null => {
    if (!authUserId) {
      return null
    }
    return {
      id: authUserId,
      role: authUserRole,
    }
  }, [authUserId, authUserRole])
  return {
    ...auth,
    authClient: betterAuthClient.authClient,
    authData,
    loginText: auth.state === 'logged-in' ? 'Account' : 'Login',
    loginLink: href(auth.state === 'logged-in' ? '/home/feed' : '/auth/login'),
  }
}
export const {
  getValidToken,
  setAuthClientToken,
  clearAuthClientToken,
  clearAllAuth,
  authState,
  authClient,
} = betterAuthClient
