import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AppleAuth,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
  AppleAuthenticationCredentialState,
  AppleAuthenticationScope,
} from '../src/platform/apple-auth/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: vi.fn(), createHybridObject: vi.fn() },
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: { flatten: (s: any) => s, absoluteFill: {} },
  View: 'View',
  Pressable: 'Pressable',
}))

vi.mock('../src/platform/generated/Controls.native', () => ({
  SignInWithAppleButton: 'SignInWithAppleButton',
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(hybrid !== null)
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/apple-auth/index.native')
}

describe('apple auth web', () => {
  it('exposes explicit unavailable status', async () => {
    expect(AppleAuth.isAvailable).toBe(false)
    expect(await AppleAuth.isAvailableAsync()).toBe(false)
  })

  it('rejects signInAsync and getCredentialStateAsync on web', async () => {
    const signInErr = await AppleAuth.signInAsync().catch((err) => err)
    expect(signInErr.code).toBe('ERR_REQUEST_FAILED')

    const credErr = await AppleAuth.getCredentialStateAsync('user').catch((err) => err)
    expect(credErr.code).toBe('ERR_REQUEST_FAILED')
  })

  it('renders null button on web', () => {
    expect(
      AppleAuth.AppleAuthenticationButton({
        buttonType: AppleAuthenticationButtonType.SIGN_IN,
        buttonStyle: AppleAuthenticationButtonStyle.BLACK,
        onPress: () => {},
      })
    ).toBe(null)
  })

  it('exposes enums and namespace', () => {
    expect(AppleAuth.AppleAuthenticationButtonType.CONTINUE).toBe(1)
    expect(AppleAuth.AppleAuthenticationButtonStyle.WHITE).toBe(0)
    expect(AppleAuth.AppleAuthenticationScope.FULL_NAME).toBe(0)
    expect(AppleAuth.AppleAuthenticationCredentialState.AUTHORIZED).toBe(1)
    expect(Object.isFrozen(AppleAuth)).toBe(true)
  })
})

describe('apple auth native entry', () => {
  it('delegates calls when available', async () => {
    const nativeModule = {
      isAvailable: vi.fn(() => true),
      signIn: vi.fn(async () => ({
        user: 'user_123',
        state: 'xyz',
        identityToken: 'jwt_token',
        authorizationCode: 'auth_code',
        email: 'user@example.com',
        fullName: { givenName: 'John', familyName: 'Doe' },
        realUserStatus: 'likelyReal',
      })),
      getCredentialState: vi.fn(async () => 'AUTHORIZED'),
    }

    const { AppleAuth: native } = await loadNativeEntry(nativeModule)
    expect(native.isAvailable).toBe(true)
    expect(await native.isAvailableAsync()).toBe(true)

    const credential = await native.signInAsync({
      requestedScopes: [AppleAuthenticationScope.FULL_NAME, AppleAuthenticationScope.EMAIL],
      nonce: 'nonce_123',
    })

    expect(credential.user).toBe('user_123')
    expect(credential.identityToken).toBe('jwt_token')
    expect(credential.fullName?.givenName).toBe('John')
    expect(credential.fullName?.familyName).toBe('Doe')
    expect(credential.email).toBe('user@example.com')
    expect(nativeModule.signIn).toHaveBeenCalledWith({
      requestedScopes: ['fullName', 'email'],
      nonce: 'nonce_123',
      state: undefined,
    })

    const state = await native.getCredentialStateAsync('user_123')
    expect(state).toBe('AUTHORIZED')
    expect(nativeModule.getCredentialState).toHaveBeenCalledWith('user_123')
  })

  it('preserves ERR_REQUEST_CANCELED on cancellation', async () => {
    const nativeModule = {
      isAvailable: vi.fn(() => true),
      signIn: vi.fn(async () => {
        const error = new Error('ERR_REQUEST_CANCELED: The user canceled the authorization request.')
        throw error
      }),
      getCredentialState: vi.fn(async () => 'AUTHORIZED'),
    }

    const { AppleAuth: native } = await loadNativeEntry(nativeModule)
    const err = await native.signInAsync().catch((e) => e)
    expect(err.code).toBe('ERR_REQUEST_CANCELED')
    expect(err.message).toBe('The user canceled the authorization request.')
  })

  it('rejects when native module reports unavailable', async () => {
    const nativeModule = {
      isAvailable: vi.fn(() => false),
      signIn: vi.fn(),
      getCredentialState: vi.fn(),
    }

    const { AppleAuth: native } = await loadNativeEntry(nativeModule)
    expect(native.isAvailable).toBe(false)
    expect(await native.isAvailableAsync()).toBe(false)

    const err = await native.signInAsync().catch((e) => e)
    expect(err.code).toBe('ERR_REQUEST_FAILED')
    expect(nativeModule.signIn).not.toHaveBeenCalled()
  })
})
