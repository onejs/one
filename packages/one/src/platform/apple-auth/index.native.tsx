import React from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { SignInWithAppleButton } from '../generated/Controls.native'
import { rethrowNativeError } from '../nativeError'
import type { OneAppleAuth } from '../specs/OneAppleAuth.nitro'
import {
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
  AppleAuthenticationCredentialState,
  AppleAuthenticationScope,
  AppleAuthenticationUserDetectionStatus,
  type AppleAuthenticationButtonProps,
  type AppleAuthenticationCredential,
  type AppleAuthenticationFullName,
  type AppleAuthenticationSignInOptions,
} from './types'

export * from './types'

let hybrid: OneAppleAuth | null | undefined

function native(): OneAppleAuth | null {
  if (hybrid === undefined) {
    hybrid = NitroModules.hasHybridObject('OneAppleAuth')
      ? NitroModules.createHybridObject<OneAppleAuth>('OneAppleAuth')
      : null
  }
  return hybrid
}

function normalizeScope(scope: AppleAuthenticationScope | string): string {
  if (scope === AppleAuthenticationScope.FULL_NAME || scope === 'fullName' || scope === 'FULL_NAME') {
    return 'fullName'
  }
  if (scope === AppleAuthenticationScope.EMAIL || scope === 'email' || scope === 'EMAIL') {
    return 'email'
  }
  return String(scope)
}

export function isAvailableAsync(): Promise<boolean> {
  const resolved = native()
  if (!resolved) return Promise.resolve(false)
  try {
    return Promise.resolve(resolved.isAvailable())
  } catch {
    return Promise.resolve(false)
  }
}

export async function signInAsync(
  options: AppleAuthenticationSignInOptions = {}
): Promise<AppleAuthenticationCredential> {
  const resolved = native()
  if (!resolved || !resolved.isAvailable()) {
    const error = new Error('Sign in with Apple is not available on this device.')
    ;(error as Error & { code: string }).code = 'ERR_REQUEST_FAILED'
    throw error
  }

  const requestedScopes = options.requestedScopes?.map(normalizeScope)
  try {
    const raw = await resolved.signIn({
      requestedScopes,
      nonce: options.nonce,
      state: options.state,
    })

    let fullName: AppleAuthenticationFullName | null = null
    if (raw.fullName) {
      fullName = {
        namePrefix: raw.fullName.namePrefix ?? null,
        givenName: raw.fullName.givenName ?? null,
        middleName: raw.fullName.middleName ?? null,
        familyName: raw.fullName.familyName ?? null,
        nameSuffix: raw.fullName.nameSuffix ?? null,
        nickname: raw.fullName.nickname ?? null,
      }
    }

    return {
      user: raw.user,
      state: raw.state ?? null,
      identityToken: raw.identityToken ?? null,
      authorizationCode: raw.authorizationCode ?? null,
      email: raw.email ?? null,
      fullName,
      realUserStatus: (raw.realUserStatus as AppleAuthenticationUserDetectionStatus) ?? AppleAuthenticationUserDetectionStatus.UNSUPPORTED,
    }
  } catch (err) {
    rethrowNativeError(err)
  }
}

export async function getCredentialStateAsync(
  user: string
): Promise<AppleAuthenticationCredentialState> {
  const resolved = native()
  if (!resolved || !resolved.isAvailable()) {
    const error = new Error('Sign in with Apple is not available on this device.')
    ;(error as Error & { code: string }).code = 'ERR_REQUEST_FAILED'
    throw error
  }
  try {
    const state = await resolved.getCredentialState(user)
    return state as AppleAuthenticationCredentialState
  } catch (err) {
    rethrowNativeError(err)
  }
}

export function AppleAuthenticationButton({
  buttonType = AppleAuthenticationButtonType.SIGN_IN,
  buttonStyle = AppleAuthenticationButtonStyle.BLACK,
  cornerRadius,
  style,
  onPress,
  ...rest
}: AppleAuthenticationButtonProps) {
  if (Platform.OS !== 'ios') return null

  const styleProp = StyleSheet.flatten(style)
  const resolvedRadius = cornerRadius ?? (typeof styleProp?.borderRadius === 'number' ? styleProp.borderRadius : undefined)

  const swiftStyle = {
    signInWithAppleButtonStyle:
      buttonStyle === AppleAuthenticationButtonStyle.WHITE
        ? ('white' as const)
        : buttonStyle === AppleAuthenticationButtonStyle.WHITE_OUTLINE
          ? ('whiteOutline' as const)
          : ('black' as const),
    ...(resolvedRadius != null ? { cornerRadius: resolvedRadius } : {}),
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={style}
        accessibilityRole="button"
        {...rest}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <SignInWithAppleButton
            swiftStyle={swiftStyle}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Pressable>
    )
  }

  return (
    <SignInWithAppleButton
      swiftStyle={swiftStyle}
      style={style}
      {...rest}
    />
  )
}

export const AppleAuth = Object.freeze({
  get isAvailable(): boolean {
    return native()?.isAvailable() ?? false
  },
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
