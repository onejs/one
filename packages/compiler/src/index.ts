import { resolvePath } from '@vxrn/utils'
import type { PluginOption, UserConfig } from 'vite'
import { transformWithBabelIfNeeded } from './transformBabel'
import { transformSWC } from './transformSWC'
import type { Options } from './types'

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

  return [
    {
      name: 'one:compiler',
      enforce: 'pre',

      config: () => {
        const config = {
          esbuild: false,
          optimizeDeps: {
            noDiscovery: true,
          },
          build: {
            rollupOptions: {
              plugins: [
                {
                  name: `swc-react-native-transform`,
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
