import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadEnv } from './loadEnv'

describe('loadEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Set a known public env var that matches the default ONE_ prefix
    process.env.ONE_PUBLIC_TEST_KEY = 'test-value'
  })

  afterEach(() => {
    // Restore original env to avoid leaking between tests
    process.env = { ...originalEnv }
  })

  it('generates dot-notation define keys for process.env', async () => {
    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['process.env.ONE_PUBLIC_TEST_KEY']).toBe('"test-value"')
  })

  it('generates dot-notation define keys for import.meta.env', async () => {
    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['import.meta.env.ONE_PUBLIC_TEST_KEY']).toBe('"test-value"')
  })

  it('creates only missing Expo aliases for One values', async () => {
    process.env.EXPO_PUBLIC_EXPO_ONLY = 'expo-value'

    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['process.env.EXPO_PUBLIC_TEST_KEY']).toBe('"test-value"')
    expect(clientEnvDefine['import.meta.env.EXPO_PUBLIC_EXPO_ONLY']).toBe('"expo-value"')
    expect(clientEnvDefine['import.meta.env.ONE_PUBLIC_EXPO_ONLY']).toBeUndefined()
    expect(process.env.EXPO_PUBLIC_TEST_KEY).toBe('test-value')
    expect(process.env.ONE_PUBLIC_EXPO_ONLY).toBeUndefined()
  })

  it('preserves explicit conflicting One and Expo values', async () => {
    process.env.ONE_PUBLIC_CONFLICT = 'one-value'
    process.env.EXPO_PUBLIC_CONFLICT = 'expo-value'

    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['process.env.ONE_PUBLIC_CONFLICT']).toBe('"one-value"')
    expect(clientEnvDefine['process.env.EXPO_PUBLIC_CONFLICT']).toBe('"expo-value"')
  })

  it('does not generate bracket-notation keys (rolldown/oxc rejects them in define)', async () => {
    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine).not.toHaveProperty('process.env["ONE_PUBLIC_TEST_KEY"]')
    expect(clientEnvDefine).not.toHaveProperty("process.env['ONE_PUBLIC_TEST_KEY']")
    expect(clientEnvDefine).not.toHaveProperty('import.meta.env["ONE_PUBLIC_TEST_KEY"]')
    expect(clientEnvDefine).not.toHaveProperty("import.meta.env['ONE_PUBLIC_TEST_KEY']")
  })

  it('does not generate define keys for non-public env vars', async () => {
    process.env.SECRET_KEY = 'secret'

    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['process.env.SECRET_KEY']).toBeUndefined()
  })

  it('includes VITE_ prefixed vars in clientEnvDefine', async () => {
    process.env.VITE_APP_TITLE = 'My App'

    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['process.env.VITE_APP_TITLE']).toBe('"My App"')
  })

  it('includes TAMAGUI_ prefixed vars in clientEnvDefine', async () => {
    process.env.TAMAGUI_TARGET = 'web'

    const { clientEnvDefine } = await loadEnv('test')

    expect(clientEnvDefine['process.env.TAMAGUI_TARGET']).toBe('"web"')
  })

  it('includes vars matching custom userPrefix', async () => {
    process.env.CUSTOM_PUBLIC_FOO = 'bar'

    const { clientEnvDefine } = await loadEnv('test', process.cwd(), 'CUSTOM_PUBLIC_')

    expect(clientEnvDefine['process.env.CUSTOM_PUBLIC_FOO']).toBe('"bar"')
  })
})
