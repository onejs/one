import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createCloudflareWranglerConfig,
  isExperimentalWorkerDevEnabled,
  loadUserWranglerConfigSync,
  shouldEnableWorkerdDev,
} from './cloudflareWranglerConfig'

describe('createCloudflareWranglerConfig', () => {
  it('synthesizes a worker config when no user wrangler file exists', () => {
    const config = createCloudflareWranglerConfig('my-app')
    expect(config.name).toBe('my-app')
    expect(config.main).toBe('worker.js')
    expect(config.compatibility_flags).toEqual(['nodejs_compat'])
    expect(config.find_additional_modules).toBe(true)
    expect(config.assets).toEqual({
      directory: 'client',
      binding: 'ASSETS',
      run_worker_first: true,
    })
  })

  it('merges user wrangler.jsonc the same way the cloudflare build does', () => {
    const config = createCloudflareWranglerConfig('generated-name', {
      name: 'test-cloudflare-user-config',
      compatibility_date: '2025-01-01',
      compatibility_flags: ['nodejs_als'],
      vars: { CUSTOM_VALUE: 'from-root-config' },
      assets: { html_handling: 'auto-trailing-slash' },
      rules: [{ type: 'ESModule', globs: ['./extra/**/*.js'], fallthrough: true }],
    })

    expect(config.name).toBe('test-cloudflare-user-config')
    expect(config.main).toBe('worker.js')
    expect(config.compatibility_date).toBe('2025-01-01')
    expect(config.compatibility_flags).toEqual(['nodejs_compat', 'nodejs_als'])
    expect(config.vars).toEqual({ CUSTOM_VALUE: 'from-root-config' })
    expect(config.assets).toEqual({
      html_handling: 'auto-trailing-slash',
      directory: 'client',
      binding: 'ASSETS',
      run_worker_first: true,
    })
    expect(config.rules).toEqual([
      { type: 'ESModule', globs: ['./server/**/*.js'], fallthrough: true },
      { type: 'ESModule', globs: ['./api/**/*.js'], fallthrough: true },
      { type: 'ESModule', globs: ['./middlewares/**/*.js'], fallthrough: true },
      { type: 'ESModule', globs: ['./assets/**/*.js'], fallthrough: true },
      { type: 'ESModule', globs: ['./extra/**/*.js'], fallthrough: true },
    ])
  })
})

describe('shouldEnableWorkerdDev', () => {
  const previous = process.env.ONE_EXPERIMENTAL_WORKER_DEV

  afterEach(() => {
    if (previous === undefined) delete process.env.ONE_EXPERIMENTAL_WORKER_DEV
    else process.env.ONE_EXPERIMENTAL_WORKER_DEV = previous
  })

  it('is off when the flag is unset', () => {
    delete process.env.ONE_EXPERIMENTAL_WORKER_DEV
    expect(isExperimentalWorkerDevEnabled()).toBe(false)
    expect(shouldEnableWorkerdDev('cloudflare', '/tmp')).toBe(false)
  })

  it('is off when the flag is on but the app has no cloudflare target or wrangler file', () => {
    process.env.ONE_EXPERIMENTAL_WORKER_DEV = '1'
    const root = mkdtempSync(join(tmpdir(), 'one-workerd-flag-'))
    try {
      expect(shouldEnableWorkerdDev(undefined, root)).toBe(false)
      expect(shouldEnableWorkerdDev('node', root)).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('is on when the flag is set and deploy is cloudflare', () => {
    process.env.ONE_EXPERIMENTAL_WORKER_DEV = '1'
    expect(shouldEnableWorkerdDev('cloudflare', '/tmp-does-not-exist')).toBe(true)
    expect(shouldEnableWorkerdDev({ target: 'cloudflare' }, '/tmp-does-not-exist')).toBe(
      true
    )
  })

  it('is on when the flag is set and wrangler.jsonc exists', () => {
    process.env.ONE_EXPERIMENTAL_WORKER_DEV = '1'
    const root = mkdtempSync(join(tmpdir(), 'one-workerd-wrangler-'))
    try {
      writeFileSync(join(root, 'wrangler.jsonc'), '{ "name": "from-file" }\n')
      expect(shouldEnableWorkerdDev(undefined, root)).toBe(true)
      expect(loadUserWranglerConfigSync(root)?.config.name).toBe('from-file')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
