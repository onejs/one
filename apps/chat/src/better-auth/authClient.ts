import { createBetterAuthClient } from '@vxrn/better-auth'

export const betterAuthClient = createBetterAuthClient()

if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  globalThis['betterAuthClient'] = betterAuthClient
}

export const {
  setAuthClientToken,
  clearAuthClientToken,
  useAuth,
  refreshAuth,
  authState,
  authClient,
} = betterAuthClient
