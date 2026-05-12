import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateBundlerConfig,
  isCiEnvironment,
  maybeGenerateBundlerConfigOnInstall,
  ONE_GENERATED_MARKER,
} from './generateBundlerConfig'

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
    expect(babel).toContain("require('one/babel-preset')")

    const metro = fs.readFileSync(path.join(tmpDir, 'metro.config.cjs'), 'utf8')
    expect(metro).toContain(ONE_GENERATED_MARKER)
    expect(metro).toContain("require('one/metro-config')")
    expect(metro).toContain('getDefaultConfig')
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
      "// hand-written\nmodule.exports = { presets: [] }\n"
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
      "// hand-written\nmodule.exports = { presets: [] }\n"
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
    expect(after).toContain("require('one/babel-preset')")
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

  it('does not clobber a non-.cjs config in the same family', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'babel.config.js'),
      'module.exports = { presets: [] }\n'
    )

    const { results } = generateBundlerConfig({ cwd: tmpDir, quiet: true })
    const babelResult = results.find(
      (r) => r.filePath.endsWith('babel.config.js') || r.filePath.endsWith('babel.config.cjs')
    )!

    expect(babelResult.action).toBe('skipped-other-format')
    // didn't write the .cjs alongside
    expect(fs.existsSync(path.join(tmpDir, 'babel.config.cjs'))).toBe(false)
  })
})

describe('isCiEnvironment', () => {
  const originalCi = process.env.CI
  const originalEasBuild = process.env.EAS_BUILD

  afterEach(() => {
    if (originalCi === undefined) delete process.env.CI
    else process.env.CI = originalCi
    if (originalEasBuild === undefined) delete process.env.EAS_BUILD
    else process.env.EAS_BUILD = originalEasBuild
  })

  it('is true when CI=true', () => {
    process.env.CI = 'true'
    delete process.env.EAS_BUILD
    expect(isCiEnvironment()).toBe(true)
  })

  it('is true when EAS_BUILD=true', () => {
    delete process.env.CI
    process.env.EAS_BUILD = 'true'
    expect(isCiEnvironment()).toBe(true)
  })

  it('is false when neither is set', () => {
    delete process.env.CI
    delete process.env.EAS_BUILD
    expect(isCiEnvironment()).toBe(false)
  })
})

describe('maybeGenerateBundlerConfigOnInstall', () => {
  let tmpDir: string
  const originalCi = process.env.CI

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-gen-bundler-ci-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    if (originalCi === undefined) delete process.env.CI
    else process.env.CI = originalCi
    delete process.env.EAS_BUILD
  })

  it('does NOT generate files when not in CI even if expo-updates is present', () => {
    delete process.env.CI
    delete process.env.EAS_BUILD
    // fake expo-updates in node_modules
    const fakeUpdates = path.join(tmpDir, 'node_modules/expo-updates')
    fs.mkdirSync(fakeUpdates, { recursive: true })
    fs.writeFileSync(
      path.join(fakeUpdates, 'package.json'),
      JSON.stringify({ name: 'expo-updates' })
    )

    maybeGenerateBundlerConfigOnInstall(tmpDir)

    expect(fs.existsSync(path.join(tmpDir, 'babel.config.cjs'))).toBe(false)
    expect(fs.existsSync(path.join(tmpDir, 'metro.config.cjs'))).toBe(false)
  })

  it('does NOT generate files in CI when expo-updates is absent', () => {
    process.env.CI = 'true'
    // no expo-updates installed
    maybeGenerateBundlerConfigOnInstall(tmpDir)

    expect(fs.existsSync(path.join(tmpDir, 'babel.config.cjs'))).toBe(false)
    expect(fs.existsSync(path.join(tmpDir, 'metro.config.cjs'))).toBe(false)
  })

  it('generates files in CI when expo-updates is present', () => {
    process.env.CI = 'true'
    const fakeUpdates = path.join(tmpDir, 'node_modules/expo-updates')
    fs.mkdirSync(fakeUpdates, { recursive: true })
    fs.writeFileSync(
      path.join(fakeUpdates, 'package.json'),
      JSON.stringify({ name: 'expo-updates' })
    )

    // suppress info logs
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    try {
      maybeGenerateBundlerConfigOnInstall(tmpDir)
    } finally {
      consoleInfo.mockRestore()
    }

    expect(fs.existsSync(path.join(tmpDir, 'babel.config.cjs'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'metro.config.cjs'))).toBe(true)
  })
})
