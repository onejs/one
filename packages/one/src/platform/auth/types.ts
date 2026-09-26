// One.Auth.Apple keeps expo-apple-authentication's option names and credential
// fields; its enums are string unions of their member names, and a user who
// backs out resolves { type: 'cancel' } where expo rejects.
export type {
  AppleAuthScope,
  AppleCredentialState,
  AppleRealUserStatus,
} from '../specs/OneAppleAuth.nitro'
import type {
  AppleAuthScope,
  AppleCredentialState,
  AppleRealUserStatus,
} from '../specs/OneAppleAuth.nitro'

export interface AppleFullName {
  namePrefix: string | null
  givenName: string | null
  middleName: string | null
  familyName: string | null
  nameSuffix: string | null
  nickname: string | null
}

export interface AppleCredential {
  user: string
  state: string | null
  fullName: AppleFullName | null
  email: string | null
  realUserStatus: AppleRealUserStatus
  identityToken: string | null
  authorizationCode: string | null
}

export type AppleSignInResult =
  | { type: 'success'; credential: AppleCredential }
  | { type: 'cancel' }

export interface AppleSignInOptions {
  requestedScopes?: AppleAuthScope[]
  state?: string
  nonce?: string
}

export interface AppleAuth {
  /** false off ios: android and the web have no sign in with apple */
  readonly isAvailable: boolean
  signIn(options?: AppleSignInOptions): Promise<AppleSignInResult>
  getCredentialState(user: string): Promise<AppleCredentialState>
}
