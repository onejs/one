import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathExists, readJSON, writeJSON } from './fs'

type State = {
  versionHash?: string
}

export async function readState(cacheDir: string) {
  const statePath = join(cacheDir, 'state.json')
  try {
    const state: State = (await pathExists(statePath)) ? await readJSON(statePath) : {}
    return state
  } catch {
    // recover from errors
    return {}
  }
}

export async function writeState(cacheDir: string, state: State) {
  const statePath = join(cacheDir, 'state.json')
  const pendingStatePath = `${statePath}.${process.pid}.${randomUUID()}.tmp`
  await mkdir(cacheDir, { recursive: true })
  try {
    await writeJSON(pendingStatePath, state)
    await rename(pendingStatePath, statePath)
  } finally {
    await rm(pendingStatePath, { force: true })
  }
}
