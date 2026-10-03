import { createStorageValue } from '@o/helpers'
import { emailOTPClient } from 'better-auth/client/plugins'
import {
  createAppBetterAuthClient,
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
      origin: `${APP_SCHEME}://`,
      tokenStore: nativeBearerTokenStore(nativeBearerToken),
    }),
  ],
})
export const useSession = authClient.useSession

export const { signIn, signUp, signOut } = authClient

export async function signInAsDemo() {
  await authClient.signUp.email({
    email: DEMO_EMAIL,
    name: DEMO_NAME,
    password: DEMO_PASSWORD,
  })
  return authClient.signIn.email({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
}
