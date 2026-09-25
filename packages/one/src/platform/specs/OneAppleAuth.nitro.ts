import type { HybridObject } from 'react-native-nitro-modules'

// native sign in with apple behind One.Auth.Apple, replacing expo-apple-authentication.
// ios drives ASAuthorizationController; android has no sign in with apple, so it
// reports isAvailable false and rejects every request the way the web entry does.

export type AppleAuthScope = 'fullName' | 'email'
export type AppleCredentialState = 'revoked' | 'authorized' | 'notFound' | 'transferred'
export type AppleRealUserStatus = 'unsupported' | 'unknown' | 'likelyReal'

export interface AppleAuthFullName {
  namePrefix?: string
  givenName?: string
  middleName?: string
  familyName?: string
  nameSuffix?: string
  nickname?: string
}

export interface AppleAuthCredential {
  user: string
  state?: string
  identityToken?: string
  authorizationCode?: string
  email?: string
  fullName?: AppleAuthFullName
  realUserStatus: AppleRealUserStatus
}

// a user who backs out is an outcome, never a rejection
export type AppleAuthResultType = 'success' | 'cancel'

export interface AppleAuthResult {
  type: AppleAuthResultType
  // set exactly when type is success
  credential?: AppleAuthCredential
}

export interface AppleAuthSignInOptions {
  requestedScopes?: AppleAuthScope[]
  nonce?: string
  state?: string
}

export interface OneAppleAuth extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isAvailable(): boolean
  signIn(options: AppleAuthSignInOptions): Promise<AppleAuthResult>
  getCredentialState(user: string): Promise<AppleCredentialState>
}
