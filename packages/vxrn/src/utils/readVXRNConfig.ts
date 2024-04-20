import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'
import { createServer } from 'vite'

export async function readVXRNConfig(): Promise<VXRNConfig> {
  if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
    return {}
  }

  // somewhat hacky creating a server just to read config?
  const vite = await createServer({
    appType: 'custom',
  })

  const userConfig = await vite.ssrLoadModule('./vxrn.config.ts', {
    fixStacktrace: true,
  })

  await vite.close()

  return userConfig?.default ?? {}
}
