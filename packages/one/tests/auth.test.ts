import { describe, expect, it, vi } from 'vitest'
import { Auth } from '../src/platform/auth/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/auth/index.native')
}

describe('Auth.Apple web entry', () => {
  it('is unavailable and rejects every request', async () => {
    expect(Auth.Apple.isAvailable).toBe(false)
    await expect(Auth.Apple.signIn()).rejects.toThrow(
      'Auth.Apple.signIn needs an iOS build'
    )
    await expect(Auth.Apple.getCredentialState('user')).rejects.toThrow(
      'Auth.Apple.getCredentialState needs an iOS build'
    )
  })
})

describe('Auth.Apple native entry', () => {
  it('passes options through and returns the credential in expo shape', async () => {
    const hybrid = {
      isAvailable: vi.fn(() => true),
      signIn: vi.fn(async () => ({
        type: 'success',
        credential: {
          user: 'user_123',
          identityToken: 'jwt_token',
          fullName: { givenName: 'John', familyName: 'Doe' },
          realUserStatus: 'likelyReal',
        },
      })),
      getCredentialState: vi.fn(async () => 'authorized'),
    }
    const { Auth: native } = await loadNativeEntry(hybrid)

    expect(native.Apple.isAvailable).toBe(true)
    const result = await native.Apple.signIn({
      requestedScopes: ['fullName', 'email'],
      nonce: 'nonce_123',
    })
    expect(hybrid.signIn).toHaveBeenCalledWith({
      requestedScopes: ['fullName', 'email'],
      nonce: 'nonce_123',
      state: undefined,
    })
    expect(result).toEqual({
      type: 'success',
      credential: {
        user: 'user_123',
        state: null,
        identityToken: 'jwt_token',
        authorizationCode: null,
        email: null,
        fullName: {
          namePrefix: null,
          givenName: 'John',
          middleName: null,
          familyName: 'Doe',
          nameSuffix: null,
          nickname: null,
        },
        realUserStatus: 'likelyReal',
      },
    })
    expect(await native.Apple.getCredentialState('user_123')).toBe('authorized')
  })

  it('resolves a cancel and restores the native error code on a failure', async () => {
    const hybrid = {
      isAvailable: vi.fn(() => true),
      signIn: vi.fn(async () => ({ type: 'cancel' })),
      getCredentialState: vi.fn(async () => {
        throw new Error(
          'E_AUTH_CREDENTIAL_STATE: Auth.Apple.getCredentialState: com.apple.AuthenticationServices.AuthorizationError 1000: failed'
        )
      }),
    }
    const { Auth: native } = await loadNativeEntry(hybrid)

    expect(await native.Apple.signIn()).toEqual({ type: 'cancel' })
    const failed = await native.Apple.getCredentialState('user').catch((error) => error)
    expect(failed.code).toBe('E_AUTH_CREDENTIAL_STATE')
    expect(failed.message).toBe(
      'Auth.Apple.getCredentialState: com.apple.AuthenticationServices.AuthorizationError 1000: failed'
    )
  })
})
