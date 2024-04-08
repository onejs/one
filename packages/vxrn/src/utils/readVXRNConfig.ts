import jiti from 'jiti'
import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'

export async function readVXRNConfig(): Promise<VXRNConfig> {
  if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
    return {}
  }
  const requireFile = jiti(process.cwd())
  const userConfig = requireFile('./vxrn.config.ts')
  return userConfig?.default ?? {}
}
