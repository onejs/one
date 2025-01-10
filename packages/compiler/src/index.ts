/**
 * Adapted from https://github.com/vitejs/vite-plugin-react-swc/blob/main/src/index.ts
 * to work on both native and web, and with reanimated and other babel fallbacks
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PluginOption, UserConfig } from 'vite'
import { runtimePublicPath } from './constants'
import { transformWithBabelIfNeeded } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Environment, Options } from './types'
import { version } from 'react/package.json'

export * from './configure'
export * from './transformBabel'
export * from './transformSWC'

export function createVXRNCompilerPlugin(optionsIn?: Partial<Options>): PluginOption[] {
  const getOptions = (environment: Environment) => {
    return {
      environment,
      mode: 'serve',
      ...optionsIn,
    } satisfies Options
  }

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
        async handler(code, _id) {
          let id = _id.split('?')[0]

          // pre process = hmr just are removing jsx but leaving imports as esm
          const isPreProcess = id.startsWith(`vxrn-swc-preprocess:`)
          if (isPreProcess) {
            id = id.replace(`vxrn-swc-preprocess:`, '')
          }

          if (id.includes(`virtual:`)) {
            return
          }

          const options = getOptions(getEnvName(this.environment.name))

          if (!isPreProcess) {
            const babelOut = await transformWithBabelIfNeeded({
              ...optionsIn?.babel,
              id,
              code,
              development: !options.production,
              environment: this.environment.name,
              reactForRNVersion: version.split('.')[0] as '18' | '19',
            })

            if (babelOut) {
              code = babelOut
            }
          }

          const out = await transformSWC(id, code, {
            ...options,
            es5: true,
            noHMR: isPreProcess,
          })

          return out
        },
      },
    },
  ]
}
