import type { HybridObject } from 'react-native-nitro-modules'

// native apple authentication behind One.AppleAuth, replacing expo-apple-authentication.
// scopes are passed as strings ('fullName', 'email') and maps to ASAuthorization.Scope on iOS.
// on Android, isAvailable returns false and signIn/getCredentialState reject with explicit absence.

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
  realUserStatus: number
}

export interface AppleAuthSignInOptions {
  requestedScopes?: string[]
  nonce?: string
  state?: string
}

export interface OneAppleAuth extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isAvailable(): boolean
  signIn(options: AppleAuthSignInOptions): Promise<AppleAuthCredential>
  getCredentialState(user: string): Promise<number>
}
