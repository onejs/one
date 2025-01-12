/**
 * Adapted from https://github.com/vitejs/vite-plugin-react-swc/blob/main/src/index.ts
 * to work on both native and web, and with reanimated and other babel fallbacks
 */

import { resolvePath } from '@vxrn/utils'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { PluginOption, UserConfig } from 'vite'
import { runtimePublicPath, validParsers } from './constants'
import { transformWithBabelIfNeeded } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Environment, Options } from './types'

export * from './configure'
export * from './transformBabel'
export * from './transformSWC'

export async function createVXRNCompilerPlugin(
  optionsIn?: Partial<Options>
): Promise<PluginOption[]> {
  const reactVersion = await (async () => {
    const path = resolvePath('react/package.json')
    const json = JSON.parse(await readFile(path, 'utf-8'))
    return json.version as string
  })()

  const envNames = {
    ios: true,
    android: true,
    client: true,
    ssr: true,
  }

  function getEnvName(name: string) {
    if (!envNames[name]) throw new Error(`Invalid env: ${name}`)
    return name as Environment
  }

  return [
    {
      name: 'one:compiler-resolve-refresh-runtime',
      apply: 'serve',
      enforce: 'pre', // Run before Vite default resolve to avoid syscalls
      resolveId: (id) => (id === runtimePublicPath ? id : undefined),
      load: (id) =>
        id === runtimePublicPath
          ? readFileSync(join(import.meta.dirname, 'refresh-runtime.js'), 'utf-8')
          : undefined,
    },

    {
      name: 'one:compiler',
      enforce: 'pre',

      config: () => {
        const config = {
          esbuild: false,
          optimizeDeps: {
            noDiscovery: true,
          },
        } satisfies UserConfig

        return {
          environments: {
            ios: config,
            android: config,
          },
        }
      },

      transform: {
        order: 'pre',
        async handler(codeIn, _id) {
          let code = codeIn

          const shouldDebug =
            process.env.NODE_ENV === 'development' && codeIn.startsWith('// debug')

          if (shouldDebug) {
            console.info(`[one] ${_id} input:`)
            console.info(codeIn)
          }

          const extension = extname(_id)
          if (!validParsers.has(extension)) {
            return
          }

          if (extension === '.css') {
            //
          }

          let id = _id.split('?')[0]

          // pre process = hmr just are removing jsx but leaving imports as esm
          const isPreProcess = id.startsWith(`vxrn-swc-preprocess:`)
          if (isPreProcess) {
            id = id.replace(`vxrn-swc-preprocess:`, '')
          }

          if (id.includes(`virtual:`)) {
            return
          }

          const environment = getEnvName(this.environment.name)
          const options = {
            environment,
            mode: 'serve',
            production: process.env.NODE_ENV === 'production',
            ...optionsIn,
          } satisfies Options

          if (!isPreProcess) {
            const babelOut = await transformWithBabelIfNeeded({
              ...optionsIn?.babel,
              id,
              code,
              development: !options.production,
              environment: getEnvName(this.environment.name),
              reactForRNVersion: reactVersion.split('.')[0] as '18' | '19',
            })

            if (babelOut) {
              if (shouldDebug) {
                console.info(`[one] ${id} ran babel:`)
                console.info(babelOut)
              }
              code = babelOut
            }
          }

          const out = await transformSWC(id, code, {
            ...options,
            es5: true,
            noHMR: isPreProcess,
          })

          if (shouldDebug) {
            console.info(`[one] ${id} final output:`)
            console.info(out)
          }

          return out
        },
      },
    },
  ]
}
