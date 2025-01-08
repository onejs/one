/**
 * Adapted from https://github.com/vitejs/vite-plugin-react-swc/blob/main/src/index.ts
 * to work on both native and web, and with reanimated and other babel fallbacks
 */

import { readFileSync } from 'node:fs'
import { resolvePath } from '@vxrn/utils'
import type { PluginOption, UserConfig } from 'vite'
import { transformWithBabelIfNeeded } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Options } from './types'
import { join } from 'node:path'

export * from './transformBabel'
export * from './transformSWC'
export * from './configure'

export function createVXRNCompilerPlugin(optionsIn?: Options): PluginOption[] {
  const getOptions = (environment: string) => {
    return {
      jsxImportSource: 'react',
      mode: 'serve',
      noHMR: environment === 'ssr',
      ...optionsIn,
      plugins: optionsIn?.plugins
        ? optionsIn?.plugins.map((el): typeof el => [resolvePath(el[0]), el[1]])
        : undefined,
    } satisfies Options
  }

  const runtimePublicPath = '/@react-refresh'

  return [
    {
      name: 'one:compiler-resolve-refresh-runtime',
      apply: 'serve',
      enforce: 'pre', // Run before Vite default resolve to avoid syscalls
      resolveId: (id) => (id === runtimePublicPath ? id : undefined),
      load: (id) =>
        id === runtimePublicPath
          ? readFileSync(join(__dirname, 'refresh-runtime.js'), 'utf-8')
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

          // for native:
          build: {
            rollupOptions: {
              plugins: [
                {
                  name: `one:compiler-react-native`,
                  options: {
                    order: 'pre',
                    handler(options) {},
                  },
                  async transform(code, id) {
                    const options = getOptions(this.environment.name)
                    const babelOut = await transformWithBabelIfNeeded({
                      id,
                      code,
                      development: !options.production,
                      ...optionsIn?.babel,
                    })

                    if (babelOut) {
                      return babelOut
                    }

                    try {
                      return await transformSWC(id, code, options)
                    } catch (err) {
                      if (process.env.DEBUG === 'vxrn') {
                        console.error(`${err}`)
                      }
                      return await transformWithBabelIfNeeded({
                        ...optionsIn?.babel,
                        getUserPlugins: () => true,
                        id,
                        code,
                        development: !options.production,
                      })
                    }
                  },
                },
              ],
            },
          },
        } satisfies UserConfig

        return {
          environments: {
            ios: config,
            android: config,
          },
        }
      },

      async transform(code, id) {
        if (id.includes(`virtual:`)) {
          return
        }

        const options = getOptions(this.environment.name)

        const babelOut = await transformWithBabelIfNeeded({
          ...optionsIn?.babel,
          id,
          code,
          development: !options.production,
        })

        if (babelOut) {
          return babelOut
        }

        const out = await transformSWC(id, code, options)
        return out
      },
    },
  ]
}
