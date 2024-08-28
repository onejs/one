import FSExtra from 'fs-extra'
import type { VXRNOptions } from '../types'
import { join } from 'node:path'
import { build } from 'esbuild'

export async function readVXRNOptions(): Promise<VXRNOptions> {
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

// // vite version:

// import FSExtra from 'fs-extra'
// import type { VXRNOptions } from '../types'
// import { join } from 'node:path'
// import { build } from 'vite'

// export async function readVXRNOptions(): Promise<VXRNOptions> {
//   if (!(await FSExtra.pathExists('vxrn.config.ts'))) {
//     return {}
//   }

//   const outfile = join(process.cwd(), 'vxrn.config.js')

//   try {
//     // output to same place so paths and relative things work
//     // build using vite:
//     await build({
//       logLevel: 'silent',
//       build: {
//         lib: {
//           entry: 'vxrn.config.ts',
//           formats: ['es'],
//           fileName: () => 'vxrn.config.js',
//         },
//         rollupOptions: {
//           external: (id) => {
//             if (id.includes('vxrn')) {
//               return false
//             }
//             // exclude node_modules:
//             return !id.startsWith('.') && !id.startsWith('/')
//           },
//         },
//         outDir: process.cwd(),
//         copyPublicDir: false,
//         assetsDir: '',
//         minify: false,
//         emptyOutDir: false,
//       },
//     })

//     const exportedConfig = (await import(outfile)).default

//     return await resolveOptionalAsyncFunction(exportedConfig)
//   } catch (err) {
//     console.error(` [vxrn] Error building vxrn.config.ts`)
//     throw err
//   } finally {
//     // FSExtra.removeSync(outfile)
//   }
// }

// async function resolveOptionalAsyncFunction(value: any) {
//   if (typeof value === 'function') {
//     value = value()
//   }
//   if (value instanceof Promise) {
//     value = await value
//   }
//   return value
// }
