import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'
import { join } from 'node:path'
import { build } from 'esbuild'

export async function readVXRNConfig(): Promise<VXRNConfig> {
  if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
    return {}
  }

  const outfile = join(process.cwd(), 'vxrn.config.js')

  try {
    // output to same place so paths and relative things work
    await build({
      entryPoints: ['vxrn.config.ts'],
      bundle: false,
      outfile,
      platform: 'node',
      format: 'esm',
      sourcemap: false,
      minify: false,
    })

    const exportedConfig = (await import(outfile)).default

    return await resolveOptionalAsyncFunction(exportedConfig)
  } catch (err) {
    console.error(` [vxrn] Error building vxrn.config.ts`)
    throw err
  } finally {
    FSExtra.removeSync(outfile)
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
