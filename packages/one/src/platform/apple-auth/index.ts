import type { ReactNode } from 'react'
import {
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
  AppleAuthenticationCredentialState,
  AppleAuthenticationScope,
  AppleAuthenticationUserDetectionStatus,
  type AppleAuthenticationButtonProps,
  type AppleAuthenticationCredential,
  type AppleAuthenticationSignInOptions,
} from './types'

export * from './types'

export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(false)
}

export function signInAsync(
  _options: AppleAuthenticationSignInOptions = {}
): Promise<AppleAuthenticationCredential> {
  const error = new Error('Sign in with Apple is not supported on this platform.')
  ;(error as Error & { code: string }).code = 'ERR_REQUEST_FAILED'
  return Promise.reject(error)
}

export function getCredentialStateAsync(
  _user: string
): Promise<AppleAuthenticationCredentialState> {
  const error = new Error('Sign in with Apple is not supported on this platform.')
  ;(error as Error & { code: string }).code = 'ERR_REQUEST_FAILED'
  return Promise.reject(error)
}

export function AppleAuthenticationButton(
  _props: AppleAuthenticationButtonProps
): ReactNode {
  return null
}

export const AppleAuth = Object.freeze({
  isAvailable: false,
  isAvailableAsync,
  signInAsync,
  getCredentialStateAsync,
  AppleAuthenticationButton,
  AppleAuthenticationButtonType,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationScope,
  AppleAuthenticationCredentialState,
  AppleAuthenticationUserDetectionStatus,
})
