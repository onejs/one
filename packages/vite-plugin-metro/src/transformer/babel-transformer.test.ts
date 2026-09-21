import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

import { transformFromAstSync } from './babel-core'
// @ts-expect-error: module.exports = has no default export in types, runtime interop provides it
import babelTransformer from './babel-transformer'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__'
)
const virtualFilename = '/proj/node_modules/expo/virtual/env.js'
const virtualSource = 'export const env = process.env;'

function runBabelTransform(src: string, filename: string, dev: boolean): any {
  // the transformer leaks BABEL_ENV=development when it was previously
  // unset; keep that pre-existing leak out of sibling tests.
  const OLD_BABEL_ENV = process.env.BABEL_ENV
  try {
    return (babelTransformer as any).transform({
      filename,
      src,
      options: {
        projectRoot: fixturesDir,
        dev,
        platform: 'ios',
        customTransformOptions: {
          environment: 'client',
          vite: {
            oneViteMetroBabelConfig: true,
            babelConfig: {
              babelrc: false,
              configFile: false,
              presets: [],
              plugins: [],
            },
          },
        },
      },
      plugins: [],
    })
  } finally {
    if (OLD_BABEL_ENV === undefined) {
      delete process.env.BABEL_ENV
    } else {
      process.env.BABEL_ENV = OLD_BABEL_ENV
    }
  }
}

function codegen(ast: any, filename: string): string {
  const out = transformFromAstSync(ast, virtualSource, {
    filename,
    babelrc: false,
    configFile: false,
    code: true,
    ast: false,
  })
  if (!out?.code) {
    throw new Error('codegen produced no code')
  }
  return out.code
}

function runCjs(
  code: string,
  opts: { requireImpl: (...args: any[]) => any; procEnv: Record<string, string> }
) {
  const module = { exports: {} as any }
  vm.runInNewContext(code, {
    require: opts.requireImpl,
    module,
    exports: module.exports,
    process: { env: opts.procEnv },
    console,
  })
  return module.exports
}

const noRequire = () => {
  throw new Error('unexpected require call')
}

describe('babel-transformer optional expo virtual env', () => {
  it('merges .env files over process.env in dev like upstream', () => {
    const result = runBabelTransform(virtualSource, virtualFilename, true)
    expect(result.ast).toBeTruthy()
    const code = codegen(result.ast, virtualFilename)
    expect(code).toContain('require.context')
    expect(code).toContain('.env.development.local')
    const contextModule: any = () => ({
      default: { EXPO_PUBLIC_SENTINEL_DOTENV: 'dotenv-sentinel-value' },
    })
    contextModule.keys = () => ['./.env']
    const requireImpl: any = noRequire
    requireImpl.context = () => contextModule
    const mod = runCjs(code, {
      requireImpl,
      procEnv: { EXPO_PUBLIC_SENTINEL_PROC: 'proc-sentinel-value' },
    })
    expect(mod.env.EXPO_PUBLIC_SENTINEL_DOTENV).toBe('dotenv-sentinel-value')
    expect(mod.env.EXPO_PUBLIC_SENTINEL_PROC).toBe('proc-sentinel-value')
  })

  it('throws a naming error in production like upstream', () => {
    const result = runBabelTransform(virtualSource, virtualFilename, false)
    expect(result.ast).toBeTruthy()
    const mod = runCjs(codegen(result.ast, virtualFilename), {
      requireImpl: noRequire,
      procEnv: {},
    })
    expect(() => mod.env.EXPO_PUBLIC_ANYTHING).toThrow(
      'not supported in production bundles'
    )
  })
})
