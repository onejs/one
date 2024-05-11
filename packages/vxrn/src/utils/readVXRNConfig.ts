import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'
import { join } from 'node:path'
import { build } from 'esbuild'

export async function readVXRNConfig(): Promise<VXRNConfig> {
  if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
    return {}
  }

  await build({
    entryPoints: ['vxrn.config.ts'],
    bundle: false,
    outfile: 'dist/vxrn.config.js',
    platform: 'node', // Specify 'browser' if it is intended for the browser
    format: 'esm', // CommonJS format, change to 'esm' if you need ECMAScript modules
    sourcemap: true, // Include if you want source maps
    minify: false, // Disable minification
  })

  const exportedConfig = (await import(join(process.cwd(), 'dist/vxrn.config.js'))).default

  return await resolveOptionalAsyncFunction(exportedConfig)
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
