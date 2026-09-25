import type { AppleAuth, AppleCredentialState, AppleSignInResult } from './types'

export type * from './types'

// web entry. the web has no sign in with apple through the OS, so the
// namespace reports it unavailable and every request rejects. same shape as
// the native entry: the published declarations are built from this file.
const Apple: AppleAuth = Object.freeze({
  isAvailable: false,
  signIn: (): Promise<AppleSignInResult> =>
    Promise.reject(new Error('Auth.Apple.signIn needs an iOS build')),
  getCredentialState: (_user: string): Promise<AppleCredentialState> =>
    Promise.reject(new Error('Auth.Apple.getCredentialState needs an iOS build')),
})

export const Auth = Object.freeze({ Apple })
