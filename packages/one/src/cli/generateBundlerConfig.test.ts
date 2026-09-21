import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateBundlerConfig, ONE_GENERATED_MARKER } from './generateBundlerConfig'

describe('generateBundlerConfig', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-gen-bundler-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes both files when missing', () => {
    const { ok, results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })

    expect(ok).toBe(true)
    expect(results.map((r) => r.action)).toEqual(['wrote', 'wrote'])

    const babel = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
    expect(babel).toContain(ONE_GENERATED_MARKER)
    expect(babel).toContain("'one/babel-preset'")
    expect(babel).toContain("'@react-native/babel-preset'")
    expect(babel).toContain('oneBundlerOptions')

    const metro = fs.readFileSync(path.join(tmpDir, 'metro.config.cjs'), 'utf8')
    expect(metro).toContain(ONE_GENERATED_MARKER)
    expect(metro).toContain("require('one/metro-config')")
    expect(metro).toContain('withOne')
  })

  it('is idempotent on second run', () => {
    generateBundlerConfig({ cwd: tmpDir, quiet: true })
    const before = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')

    const { results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })
    expect(results.map((r) => r.action)).toEqual(['kept', 'kept'])

    const after = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
    expect(after).toBe(before)
  })

  it('refuses to overwrite a customized file without --force', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'babel.config.cjs'),
      '// hand-written\nmodule.exports = { presets: [] }\n'
    )

    const { ok, results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })
    const babelResult = results.find((r) => r.filePath.endsWith('babel.config.cjs'))!

    expect(babelResult.action).toBe('skipped-customized')
    // ok is true: customized = legitimate user state, not an error
    expect(ok).toBe(true)

    const after = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
    expect(after).toContain('hand-written')
  })

  it('overwrites a customized file when --force is set', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'babel.config.cjs'),
      '// hand-written\nmodule.exports = { presets: [] }\n'
    )

    const { results } = generateBundlerConfig({
      cwd: tmpDir,
      force: true,
      quiet: true,
    })
    const babelResult = results.find((r) => r.filePath.endsWith('babel.config.cjs'))!

    expect(babelResult.action).toBe('wrote')
    const after = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
    expect(after).toContain(ONE_GENERATED_MARKER)
    expect(after).not.toContain('hand-written')
  })

  it('rewrites a stale marked file', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'babel.config.cjs'),
      `// ${ONE_GENERATED_MARKER}\n// old content from previous version\nmodule.exports = {}\n`
    )

    const { results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })
    const babelResult = results.find((r) => r.filePath.endsWith('babel.config.cjs'))!

    expect(babelResult.action).toBe('wrote')
    const after = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
    expect(after).toContain("'one/babel-preset'")
    expect(after).not.toContain('old content from previous version')
  })

  describe('--check mode', () => {
    it('exits ok when files exist and match', () => {
      generateBundlerConfig({ cwd: tmpDir, quiet: true })

      const { ok, results } = generateBundlerConfig({
        cwd: tmpDir,
        check: true,
        quiet: true,
      })
      expect(ok).toBe(true)
      expect(results.every((r) => r.action === 'kept')).toBe(true)
    })

    it('exits not-ok when files are missing', () => {
      const { ok, results } = generateBundlerConfig({
        cwd: tmpDir,
        check: true,
        quiet: true,
      })
      expect(ok).toBe(false)
      expect(results.every((r) => r.action === 'would-write')).toBe(true)
      // and didn't actually write
      expect(fs.existsSync(path.join(tmpDir, 'babel.config.cjs'))).toBe(false)
    })

    it('exits not-ok when a marked file is stale', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'babel.config.cjs'),
        `// ${ONE_GENERATED_MARKER}\nmodule.exports = {}\n`
      )
      fs.writeFileSync(
        path.join(tmpDir, 'metro.config.cjs'),
        `// ${ONE_GENERATED_MARKER}\nmodule.exports = {}\n`
      )

      const { ok, results } = generateBundlerConfig({
        cwd: tmpDir,
        check: true,
        quiet: true,
      })
      expect(ok).toBe(false)
      expect(results.every((r) => r.action === 'would-overwrite')).toBe(true)
    })
  })

  describe('--eject mode', () => {
    it('writes files WITHOUT the @one/generated marker', () => {
      const { results } = generateBundlerConfig({ cwd: tmpDir, eject: true, quiet: true })

      expect(results.map((r) => r.action)).toEqual(['wrote', 'wrote'])

      const babel = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
      expect(babel).not.toContain(ONE_GENERATED_MARKER)
      expect(babel).toContain('you own this file')
      expect(babel).toContain("'one/babel-preset'")

      const metro = fs.readFileSync(path.join(tmpDir, 'metro.config.cjs'), 'utf8')
      expect(metro).not.toContain(ONE_GENERATED_MARKER)
      expect(metro).toContain('withOne')
    })

    it('subsequent generation treats ejected files as customized', () => {
      generateBundlerConfig({ cwd: tmpDir, eject: true, quiet: true })
      const before = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')

      // regular generation leaves user-owned files alone
      const { results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })
      expect(results.every((r) => r.action === 'skipped-customized')).toBe(true)

      const after = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
      expect(after).toBe(before)
    })
  })

  it('does not clobber a non-.cjs config in the same family', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'babel.config.js'),
      'module.exports = { presets: [] }\n'
    )

    const { results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })
    const babelResult = results.find(
      (r) =>
        r.filePath.endsWith('babel.config.js') || r.filePath.endsWith('babel.config.cjs')
    )!

    expect(babelResult.action).toBe('skipped-other-format')
    // didn't write the .cjs alongside
    expect(fs.existsSync(path.join(tmpDir, 'babel.config.cjs'))).toBe(false)
  })

  it('embeds loaded One router/setup options into both config files', () => {
    generateBundlerConfig({
      cwd: tmpDir,
      quiet: true,
      oneOptions: {
        router: {
          root: 'src/routes',
          ignoredRouteFiles: ['**/*.native-test.*'],
          linking: { scheme: 'myapp', prefixes: ['https://example.com/app'] },
        },
        setupFile: {
          native: 'src/setup.native.ts',
        },
      },
    })

    const babel = fs.readFileSync(path.join(tmpDir, 'babel.config.cjs'), 'utf8')
    const metro = fs.readFileSync(path.join(tmpDir, 'metro.config.cjs'), 'utf8')

    for (const file of [babel, metro]) {
      expect(file).toContain('"routerRoot": "src/routes"')
      expect(file).toContain('"ignoredRouteFiles"')
      expect(file).toContain('"**/*.native-test.*"')
      expect(file).toContain('"scheme": "myapp"')
      expect(file).toContain('"native": "src/setup.native.ts"')
    }
  })

  it('refuses to silently drop non-serializable options', () => {
    expect(() =>
      generateBundlerConfig({
        cwd: tmpDir,
        quiet: true,
        oneOptions: {
          router: {
            linking: {
              // the plugin API only accepts serializable router.linking fields
              filter: () => true,
            } as any,
          },
        },
      })
    ).toThrow(/JSON-serializable/)
  })
})
