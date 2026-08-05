import FSExtra from 'fs-extra'
import { randomUUID } from 'node:crypto'
import { rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

type State = {
  versionHash?: string
}

export async function readState(cacheDir: string) {
  const statePath = join(cacheDir, 'state.json')
  try {
    const state: State = (await FSExtra.pathExists(statePath))
      ? await FSExtra.readJSON(statePath)
      : {}
    return state
  } catch {
    // recover from errors
    return {}
  }
}

export async function writeState(cacheDir: string, state: State) {
  const statePath = join(cacheDir, 'state.json')
  const pendingStatePath = `${statePath}.${process.pid}.${randomUUID()}.tmp`
  await FSExtra.ensureDir(cacheDir)
  try {
    await FSExtra.writeJSON(pendingStatePath, state)
    await rename(pendingStatePath, statePath)
  } finally {
    await rm(pendingStatePath, { force: true })
  }
}
