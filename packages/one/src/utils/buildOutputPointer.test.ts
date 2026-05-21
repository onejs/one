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
    // both the stale-pointer warning and the missing-dist warning fire
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0][0]).toMatch(/build-pointer\.json points to/)
    expect(warn.mock.calls[1][0]).toMatch(/no build-output pointer/)
  })

  it('falls back to dist when no pointer exists and warns about missing dist', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(await resolveServeOutDir()).toBe('dist')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toMatch(/no build-output pointer/)
  })

  it('does not warn when falling back to an existing dist/ build', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await FSExtra.ensureDir('dist')
    await FSExtra.writeJSON(join('dist', 'buildInfo.json'), {})

    expect(await resolveServeOutDir()).toBe('dist')
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns when the pointer write fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const writeSpy = vi
      .spyOn(FSExtra, 'writeJSON')
      .mockRejectedValueOnce(new Error('permission denied'))

    await writeBuildOutputPointer('build-out')

    expect(writeSpy).toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toMatch(/could not write build-output pointer/)
  })
})
