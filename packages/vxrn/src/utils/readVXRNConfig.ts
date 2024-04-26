import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'
import { createServer } from 'vite'
import jiti from 'jiti'

export async function readVXRNConfig(): Promise<VXRNConfig> {
  if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
    return {}
  }

  if (process.env.VXRN_CJS) {
    const requireFile = jiti(process.cwd(), {
      esmResolve: true,
    })
    const userConfig = requireFile('./vxrn.config.ts')
    return resolveOptionalAsyncFunction(userConfig?.default ?? {})
  }

  // try esm load
  try {
    // somewhat hacky creating a server just to read config?
    const vite = await createServer({
      logLevel: 'silent',
      appType: 'custom',
    })

    const userConfig = await vite.ssrLoadModule('./vxrn.config.ts', {
      fixStacktrace: true,
    })

    await vite.close()
    return resolveOptionalAsyncFunction(userConfig?.default ?? {})
  } catch (err) {
    console.info(
      ` [vxrn] Error loading config via ESM, attempting CJS, set VXRN_CJS=1 to run in cjs mode`
    )
    throw err
  }
}

async function resolveOptionalAsyncFunction(value: any) {
  if (typeof value === 'function') {
    value = value()
  }
  if (value instanceof Promise) {
    value = await value
  }
  return value
}
