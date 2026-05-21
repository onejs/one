import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import FSExtra from 'fs-extra'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildOutputPointerPath,
  resolveServeOutDir,
  writeBuildOutputPointer,
} from './buildOutputPointer'

describe('build output pointer', () => {
  const originalCwd = process.cwd()
  let tempRoot = ''

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'one-build-pointer-'))
    process.chdir(tempRoot)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    vi.restoreAllMocks()
    await FSExtra.remove(tempRoot)
  })

  it('prefers an explicit serve outDir', async () => {
    await FSExtra.ensureDir('build-out')
    await FSExtra.writeJSON(join('build-out', 'buildInfo.json'), {})
    await writeBuildOutputPointer('build-out')

    expect(await resolveServeOutDir('manual-out')).toBe('manual-out')
  })

  it('preserves serving from inside the output directory', async () => {
    await FSExtra.writeJSON('buildInfo.json', {})
    await FSExtra.ensureDir('build-out')
    await FSExtra.writeJSON(join('build-out', 'buildInfo.json'), {})
    await writeBuildOutputPointer('build-out')

    expect(await resolveServeOutDir()).toBe('.')
  })

  it('resolves the outDir written by build', async () => {
    await FSExtra.ensureDir('build-out')
    await FSExtra.writeJSON(join('build-out', 'buildInfo.json'), {})

    await writeBuildOutputPointer('build-out')

    expect(await FSExtra.readJSON(buildOutputPointerPath)).toEqual({
      outDir: 'build-out',
    })
    expect(await resolveServeOutDir()).toBe('build-out')
  })

  it('falls back to dist when the pointer is stale', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await writeBuildOutputPointer('missing-out')

    expect(await resolveServeOutDir()).toBe('dist')
    expect(warn).toHaveBeenCalledOnce()
  })

  it('falls back to dist when no pointer exists', async () => {
    expect(await resolveServeOutDir()).toBe('dist')
  })
})
