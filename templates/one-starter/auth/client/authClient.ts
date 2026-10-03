import { createStorageValue } from '@o/helpers'
import { emailOTPClient } from 'better-auth/client/plugins'
import {
  clearAuthSession,
  createAppBetterAuthClient,
  reestablishAuthSession,
  nativeBearerTokenStore,
  platformClient,
} from '~/auth/helpers'
import { APP_SCHEME, DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD, SERVER_URL } from '~/constants'

export const nativeBearerToken = createStorageValue<string>(`${APP_SCHEME}-native-bearer-token`)

export const { authClient, useAuth } = createAppBetterAuthClient({
  baseURL: SERVER_URL,
  plugins: [
    emailOTPClient(),
    platformClient({
      tokenStore: nativeBearerTokenStore(nativeBearerToken),
    }),
  ],
})
export const useSession = authClient.useSession

export async function signOut() {
  const result = await authClient.signOut()
  if (!result.error) clearAuthSession(authClient)
  return result
}

export async function signInAsDemo() {
  try {
    if (process.env.NODE_ENV !== 'development') throw new Error('demo login is development-only')
    await authClient.signUp.email({
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      password: DEMO_PASSWORD,
    })
    const result = await authClient.signIn.email({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    if (!result.error) await reestablishAuthSession(authClient)
    return result
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'SESSION_CONFIRMATION_FAILED',
        message: error instanceof Error ? error.message : 'Demo login failed',
        status: 500,
        statusText: 'Session confirmation failed',
      },
    }
  }
}
