import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'
import oneRouterMetroPlugin from './one-router-metro'

const baseOptions = {
  ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY: './app',
  ONE_ROUTER_ROOT_FOLDER_NAME: 'app',
  ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING: '\\./app/.*',
}

function transform(code: string, filename: string, opts: Record<string, any> = {}) {
  const result = transformSync(code, {
    filename,
    plugins: [[oneRouterMetroPlugin, { ...baseOptions, ...opts }]],
    parserOpts: { sourceType: 'module' },
  })
  return result?.code ?? ''
}

describe('one-router-metro babel plugin', () => {
  describe('setup file import ordering', () => {
    const metroEntry = [
      'import { createApp } from "one";',
      'import { ctx } from "./metro-entry-ctx.js";',
      '',
      'createApp({ routes: {} });',
    ].join('\n')

    it('injects setup import AFTER all existing imports in metro-entry.js', () => {
      const code = transform(metroEntry, '/project/node_modules/one/metro-entry.js', {
        ONE_SETUP_FILE_NATIVE: './setup-native.ts',
      })

      // setup import must exist
      expect(code).toContain('./setup-native.ts')

      // setup import must come AFTER both existing imports
      const createAppPos = code.indexOf('from "one"')
      const ctxPos = code.indexOf('metro-entry-ctx')
      const setupPos = code.indexOf('./setup-native.ts')

      expect(createAppPos).toBeGreaterThan(-1)
      expect(ctxPos).toBeGreaterThan(-1)
      expect(setupPos).toBeGreaterThan(-1)
      expect(setupPos).toBeGreaterThan(createAppPos)
      expect(setupPos).toBeGreaterThan(ctxPos)
    })

    it('injects setup import BEFORE non-import code', () => {
      const code = transform(metroEntry, '/project/node_modules/one/metro-entry.js', {
        ONE_SETUP_FILE_NATIVE: './setup-native.ts',
      })

      const setupPos = code.indexOf('./setup-native.ts')
      const createAppCallPos = code.indexOf('createApp({')

      expect(setupPos).toBeGreaterThan(-1)
      expect(createAppCallPos).toBeGreaterThan(-1)
      expect(setupPos).toBeLessThan(createAppCallPos)
    })

    it('does not inject setup import when no setup file configured', () => {
      const code = transform(metroEntry, '/project/node_modules/one/metro-entry.js')
      expect(code).not.toContain('setup')
    })

    it('does not inject setup import for non-metro-entry files', () => {
      const code = transform(metroEntry, '/project/src/app.js', {
        ONE_SETUP_FILE_NATIVE: './setup-native.ts',
      })
      expect(code).not.toContain('setup-native')
    })

    it('handles file with no imports by prepending setup', () => {
      const noImports = 'const x = 1;\nconsole.log(x);'
      const code = transform(noImports, '/project/node_modules/one/metro-entry.js', {
        ONE_SETUP_FILE_NATIVE: './setup-native.ts',
      })

      expect(code).toContain('./setup-native.ts')
      // setup should be at the top since there are no other imports
      const setupPos = code.indexOf('./setup-native.ts')
      const constPos = code.indexOf('const x')
      expect(setupPos).toBeLessThan(constPos)
    })
  })

  describe('env replacements', () => {
    it('replaces process.env.ONE_ROUTER_ROOT_FOLDER_NAME', () => {
      const code = transform(
        'const x = process.env.ONE_ROUTER_ROOT_FOLDER_NAME;',
        '/project/src/app.js'
      )
      expect(code).toContain('"app"')
      expect(code).not.toContain('process.env')
    })

    it('replaces process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY', () => {
      const code = transform(
        'const x = process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY;',
        '/project/src/app.js'
      )
      expect(code).toContain('"./app"')
    })

    it('replaces process.env.ONE_ROUTER_REQUIRE_CONTEXT_REGEX', () => {
      const code = transform(
        'const x = process.env.ONE_ROUTER_REQUIRE_CONTEXT_REGEX;',
        '/project/src/app.js'
      )
      // should be a regex literal
      expect(code).toMatch(/\/\\\.\/app\/\.\*\//)
    })
  })
})
