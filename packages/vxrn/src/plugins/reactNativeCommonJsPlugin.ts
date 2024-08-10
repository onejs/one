import { parse } from 'es-module-lexer'
import { dirname } from 'node:path'
import { mergeConfig, type Plugin, type UserConfig } from 'vite'
import { getVitePath } from '../utils/getVitePath'

const getNativeExtensions = (platform: 'ios' | 'android') => {
  return [
    `.${platform}.tsx`,
    `.${platform}.ts`,
    `.${platform}.jsx`,
    `.${platform}.js`,
    '.native.js',
    '.native.ts',
    '.native.tsx',
    '.tsx',
    '.ts',
    '.js',
    '.jsx',
    '.json',
    '.mjs',
  ]
}

export function reactNativeCommonJsPlugin(options: {
  root: string
  port: number
  mode: 'build' | 'serve'
}): Plugin {
  return {
    name: 'native',
    enforce: 'pre',

    config: async () => {
      const sharedNativeConfig = {
        // Subfolder bases are not supported, and shouldn't be needed because we're embedding everything
        base: undefined,

        define: {
          'process.env.REACT_NATIVE_SERVER_PUBLIC_PORT': JSON.stringify(`${options.port}`),
        },

        build: {
          modulePreload: {
            polyfill: false,
          },
          // Ensures that even very large assets are inlined in your JavaScript.
          assetsInlineLimit: 100000000,
          // Avoid warnings about large chunks
          chunkSizeWarningLimit: 100000000,
          // Emit all CSS as a single file, which `vite-plugin-singlefile` can then inline
          cssCodeSplit: false,
          // Avoids the extra step of testing Brotli compression, which isn't really pertinent to a file served locally
          reportCompressedSize: false,

          rollupOptions: {
            output: {
              preserveModules: true,
              manualChunks: undefined,
              // Ensure that as many resources as possible are inlined.
              // inlineDynamicImports: true,
              // this fixes some warnings but breaks import { default as config }
              exports: 'named',
              // ensures we have clean names for our require paths
              entryFileNames: () => `[name].js`,
            },

            plugins: [
              {
                name: `force-export-all`,
                async transform(code, id) {
                  if (id.includes('?commonjs')) {
                    return
                  }

                  // if (!id.includes('/node_modules/')) {
                  //   return
                  // }
                  try {
                    const [imports, exports] = parse(code)
                    let forceExports = ''
                    // note that es-module-lexer parses export * from as an import (twice) for some reason
                    let counts = {}
                    for (const imp of imports) {
                      if (imp.n && imp.n[0] !== '.') {
                        counts[imp.n] ||= 0
                        counts[imp.n]++
                        if (counts[imp.n] == 2) {
                          // star export
                          const path = await getVitePath(options.root, dirname(id), imp.n)
                          forceExports += `Object.assign(exports, require("${path}"));`
                        }
                      }
                    }
                    forceExports += exports
                      .map((e) => {
                        if (e.n === 'default') {
                          return ''
                        }
                        let out = ''
                        if (e.ln !== e.n && !RESERVED_WORDS.includes(e.n)) {
                          // forces the "as x" to be referenced so it gets exported
                          out += `\n__ignore = typeof ${e.n} === 'undefined' ? 0 : 0;`
                        }
                        out += `\nglobalThis.____forceExport = ${e.ln}`
                        return out
                      })
                      .join(';')
                    return code + '\n' + forceExports
                  } catch (err) {
                    console.warn(`Error forcing exports, probably ok`, id)
                  }
                },
              },
            ],
          },
        },

        optimizeDeps: {
          noDiscovery: true,
          include: undefined,

          esbuildOptions: {
            loader: {
              '.js': 'jsx',
            },
          },
        },
      } satisfies UserConfig

      // per-enviroment config:

      return {
        environments: {
          ios: mergeConfig(sharedNativeConfig, {
            define: {
              'process.env.REACT_NATIVE_PLATFORM': JSON.stringify(`ios`),
            },

            resolve: {
              extensions: getNativeExtensions('ios'),
              conditions: ['react-native-import', 'react-native'],
            },

            optimizeDeps: {
              esbuildOptions: {
                resolveExtensions: getNativeExtensions('ios'),

                plugins: [
                  {
                    name: 'react-native-assets',
                    setup(build) {
                      build.onResolve(
                        {
                          filter: /\.(png|jpg|gif|webp)$/,
                        },
                        async ({ path, namespace }) => {
                          return {
                            path: '',
                            external: true,
                          }
                        }
                      )
                    },
                  },
                ],
              },
            },
          } satisfies UserConfig),

          android: mergeConfig(sharedNativeConfig, {
            define: {
              'process.env.REACT_NATIVE_PLATFORM': JSON.stringify(`android`),
            },

            resolve: {
              extensions: getNativeExtensions('android'),
              conditions: ['react-native-import', 'react-native'],
            },

            optimizeDeps: {
              esbuildOptions: {
                resolveExtensions: getNativeExtensions('android'),
              },
            },
          } satisfies UserConfig),
        },
      }
    },
  }
}

/**
 * List of reserved words in JS. From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words.
 */
const RESERVED_WORDS = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'let',
  'static',
  'yield',
  'enum',
]
