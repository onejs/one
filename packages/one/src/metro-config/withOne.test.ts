import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { withOne } from './withOne'

const projectRoot = path.resolve(__dirname, '../../')

describe('withOne', () => {
  it('returns a config produced by the production native bundle pipeline', async () => {
    const config = (await withOne(projectRoot)) as any

    // The result is whatever Metro's loadConfig returns. The shape must
    // include the resolver and transformer fields the production pipeline
    // installs.
    expect(config).toBeTruthy()
    expect(config.resolver).toBeTruthy()
    expect(typeof config.resolver.resolveRequest).toBe('function')
    expect(config.transformer).toBeTruthy()
    expect(config.transformer.babelTransformerPath).toMatch(
      /vite-plugin-metro.*babel-transformer/
    )
  })

  it('orders sourceExts so .js wins over .mjs (the proven One fix)', async () => {
    const config = (await withOne(projectRoot)) as any
    const exts: string[] = config.resolver.sourceExts
    expect(exts).toContain('mjs')
    expect(exts).toContain('js')
    // .js must appear before .mjs so platform-aware lookup finds
    // `.native.js` before `.mjs` for one's dist
    expect(exts.indexOf('js')).toBeLessThan(exts.indexOf('mjs'))
  })

  it('accepts a project root as the first arg', async () => {
    // Mirrors `withOne(__dirname)` usage from a generated metro.config.cjs
    const config = (await withOne(projectRoot)) as any
    expect(config).toBeTruthy()
  })
})
