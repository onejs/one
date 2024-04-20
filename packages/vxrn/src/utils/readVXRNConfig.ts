import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'
import { createServer } from 'vite'
import jiti from 'jiti'

export async function readVXRNConfig(): Promise<VXRNConfig> {
  if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
    return {}
  }

  // try esm load
  try {
    // somewhat hacky creating a server just to read config?
    const vite = await createServer({
      appType: 'custom',
    })

    const userConfig = await vite.ssrLoadModule('./vxrn.config.ts', {
      fixStacktrace: true,
    })

    await vite.close()
    return userConfig?.default ?? {}
  } catch (err) {
    const requireFile = jiti(process.cwd(), {
      esmResolve: true,
    })
    const userConfig = requireFile('./vxrn.config.ts')
    return userConfig?.default ?? {}
  }
}
