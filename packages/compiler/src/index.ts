import { createRequire } from 'node:module'
import type { PluginOption, UserConfig } from 'vite'
import { transformWithBabelIfNeeded } from './transformBabel'
import { swcTransform } from './transformSWC'
import type { Options } from './types'

export * from './transformBabel'
export * from './transformSWC'
export * from './configure'

const resolve = createRequire(
  typeof __filename !== 'undefined' ? __filename : import.meta.url
).resolve

export function createVXRNCompilerPlugin(optionsIn?: Options): PluginOption[] {
  const options = {
    mode: optionsIn?.mode ?? 'serve',
    jsxImportSource: optionsIn?.jsxImportSource ?? 'react',
    tsDecorators: optionsIn?.tsDecorators,
    plugins: optionsIn?.plugins
      ? optionsIn?.plugins.map((el): typeof el => [resolve(el[0]), el[1]])
      : undefined,
    production: optionsIn?.production,
  }

  const development = optionsIn?.production ? false : options.mode === 'serve'

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
                    const babelOut = await transformWithBabelIfNeeded({
                      id,
                      code,
                      development,
                      ...optionsIn?.babel,
                    })

                    if (babelOut) {
                      return babelOut
                    }

                    try {
                      return await swcTransform(id, code, options)
                    } catch (err) {
                      if (process.env.DEBUG === 'vxrn') {
                        console.error(`${err}`)
                      }
                      return await transformWithBabelIfNeeded({
                        ...optionsIn?.babel,
                        getUserPlugins: () => true,
                        id,
                        code,
                        development,
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

      configResolved(config) {
        const mdxIndex = config.plugins.findIndex((p) => p.name === '@mdx-js/rollup')
        if (
          mdxIndex !== -1 &&
          mdxIndex > config.plugins.findIndex((p) => p.name === 'vite:react-swc')
        ) {
          throw new Error('[vite:react-swc] The MDX plugin should be placed before this plugin')
        }
      },

      async transform(code, id) {
        if (id.includes(`virtual:`)) {
          return
        }

        const babelOut = await transformWithBabelIfNeeded({
          ...optionsIn?.babel,
          id,
          code,
          development,
        })

        if (babelOut) {
          return babelOut
        }

        const out = await swcTransform(id, code, options)
        return out
      },
    },
  ]
}
