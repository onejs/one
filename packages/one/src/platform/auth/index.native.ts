import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneAppleAuth } from '../specs/OneAppleAuth.nitro'
import type { AppleAuth, AppleSignInOptions, AppleSignInResult } from './types'

export type * from './types'

// the OneAppleAuth hybrid object is created on first use and cached. the
// button that starts the flow is One.iOS.SignInWithAppleButton, or any button
// whose press calls Auth.Apple.signIn.
let hybrid: OneAppleAuth | undefined

function native(): OneAppleAuth {
  hybrid ??= NitroModules.createHybridObject<OneAppleAuth>('OneAppleAuth')
  return hybrid
}

async function signIn(options: AppleSignInOptions = {}): Promise<AppleSignInResult> {
  const result = await native()
    .signIn({
      requestedScopes: options.requestedScopes,
      nonce: options.nonce,
      state: options.state,
    })
    .catch(rethrowNativeError)
  if (result.type === 'cancel') return { type: 'cancel' }
  const raw = result.credential
  if (!raw) throw new Error('Auth.Apple.signIn: success without a credential')
  return {
    type: 'success',
    credential: {
      user: raw.user,
      state: raw.state ?? null,
      identityToken: raw.identityToken ?? null,
      authorizationCode: raw.authorizationCode ?? null,
      email: raw.email ?? null,
      fullName: raw.fullName
        ? {
            namePrefix: raw.fullName.namePrefix ?? null,
            givenName: raw.fullName.givenName ?? null,
            middleName: raw.fullName.middleName ?? null,
            familyName: raw.fullName.familyName ?? null,
            nameSuffix: raw.fullName.nameSuffix ?? null,
            nickname: raw.fullName.nickname ?? null,
          }
        : null,
      realUserStatus: raw.realUserStatus,
    },
  }
}

const Apple: AppleAuth = Object.freeze({
  get isAvailable() {
    return native().isAvailable()
  },
  signIn,
  getCredentialState: (user: string) =>
    native().getCredentialState(user).catch(rethrowNativeError),
})

export const Auth = Object.freeze({ Apple })
