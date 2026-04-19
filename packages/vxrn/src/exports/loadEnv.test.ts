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
