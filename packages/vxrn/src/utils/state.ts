import FSExtra from 'fs-extra'
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
  await FSExtra.ensureDir(cacheDir)
  await FSExtra.writeJSON(statePath, state)
}
