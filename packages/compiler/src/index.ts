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

      async transform(code, _id) {
        const id = _id.split('?')[0]
        if (id.includes(`virtual:`)) {
          return
        }

        const shouldSimpleTransform = code.startsWith(`//!disable-react-refresh`)
        const options = getOptions(getEnvName(this.environment.name))

        if (!shouldSimpleTransform) {
          const babelOut = await transformWithBabelIfNeeded({
            ...optionsIn?.babel,
            id,
            code,
            development: !options.production,
          })

          if (babelOut) {
            code = babelOut
          }
        }

        const out = await transformSWC(id, code, {
          ...options,
          es5: true,
          noHMR: shouldSimpleTransform,
        })

        return out
      },
    },
  ]
}
