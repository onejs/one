import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, vi } from 'vitest'
import { nativeSourceContract, renderSwiftSourceGlue, writeSwiftPackageArtifacts } from './nativeSourceContract'

// directory enumeration order is unspecified and differs between node and bun.
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>()
  return {
    ...fs,
    readdirSync: (path: import('node:fs').PathLike, options: { withFileTypes: true }) => {
      return fs.readdirSync(path, options)
        .sort((a, b) => a.name < b.name ? 1 : a.name > b.name ? -1 : 0)
    },
  }
})

test('package hash and glue use canonical file order regardless of directory enumeration', () => {
  const root = mkdtempSync(join(tmpdir(), 'one-source-order-'))
  try {
    const pkg = join(root, 'native-source')
    mkdirSync(pkg)
    const audio = '@MainActor final class Audio: PeachModule { init() {}\n func value() -> Double { 1 }\n}'
    const echo = '@MainActor final class Echo: PeachModule { init() {}\n func value() -> Double { 2 }\n}'
    writeFileSync(join(pkg, 'Echo.swift'), echo)
    writeFileSync(join(pkg, 'Audio.swift'), audio)
    const actual = writeSwiftPackageArtifacts(pkg)
    const expected = renderSwiftSourceGlue('native_source', [
      nativeSourceContract(join(pkg, 'Audio.swift'), audio),
      nativeSourceContract(join(pkg, 'Echo.swift'), echo),
    ])
    expect(Object.keys(actual.files)).toEqual(['Audio.swift', 'Echo.swift'])
    expect(actual.hash).toBe(expected.hash)
    expect(actual.glue).toBe(expected.source)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
