/**
 * Adapted from https://github.com/vitejs/vite-plugin-react-swc/blob/main/src/index.ts
 * to work on both native and web, and with reanimated and other babel fallbacks
 */

import { resolvePath } from '@vxrn/utils'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { PluginOption, UserConfig } from 'vite'
import { debug, runtimePublicPath, validParsers } from './constants'
import { getBabelOptions, transformBabel } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Environment, GetTransformProps, Options } from './types'

export * from './configure'
export * from './transformBabel'
export * from './transformSWC'
export type { GetTransform } from './types'

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
          const production = process.env.NODE_ENV === 'production'

          const transformProps: GetTransformProps = {
            id,
            code,
            development: !production,
            environment,
            reactForRNVersion: reactVersion.split('.')[0] as '18' | '19',
          }

          const userTransform = optionsIn?.transform?.(transformProps)

          if (userTransform === false) {
            return
          }

          if (!isPreProcess && userTransform !== 'swc') {
            const babelOptions = getBabelOptions({
              ...transformProps,
              userSetting: userTransform,
            })

            if (babelOptions) {
              const babelOut = await transformBabel(id, code, babelOptions)
              if (babelOut) {
                debug?.(`[${id}] transformed with babel options: ${JSON.stringify(babelOptions)}`)
                code = babelOut
              }
            }

            // we always go to swc for now to ensure class transforms + react refesh
            // we could make the babel plugin support those if we want to avoid
          }

          const swcOptions = {
            environment: environment,
            mode: optionsIn?.mode || 'serve',
            production,
            ...optionsIn,
          } satisfies Options

          const out = await transformSWC(id, code, {
            ...swcOptions,
            es5: true,
            noHMR: isPreProcess,
          })

          if (shouldDebug) {
            console.info(`swcOptions`, swcOptions)
            console.info(`final output:`, out?.code)
          }

          return out
        },
      },
    },
  ]
}
