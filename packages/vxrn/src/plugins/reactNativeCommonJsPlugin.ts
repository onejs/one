import { parse } from 'es-module-lexer'
import { mergeConfig, type Plugin, type UserConfig } from 'vite'

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

export const conditions = ['react-native-import', 'react-native']

export function reactNativeCommonJsPlugin(options: {
  root: string
  port: number
  mode: 'build' | 'serve'
}): Plugin {
  let resolver

  return {
    name: 'native',
    enforce: 'pre',

    async configResolved(config) {
      resolver = config.createResolver({
        conditions,
      })
    },

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
            treeshake: false,

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
                    const [foundImports, foundExports] = parse(code)

                    // build a rough mapping of identifiers to moduleName
                    const idToModule: Record<string, string> = {}
                    for (const imp of foundImports) {
                      if (imp.n) {
                        const line = code.slice(imp.ss, imp.se)
                        const imports = getAllImportedIdentifiers(line)
                        for (const id of imports) {
                          idToModule[id] = imp.n
                        }
                      }
                    }

                    // moduleName => export identifiers
                    const toReExport: Record<string, string[]> = {}
                    for (const exp of foundExports) {
                      const expName = exp.ln || exp.n

                      if (RESERVED_WORDS.has(expName)) {
                        continue
                      }

                      const moduleName = idToModule[expName]
                      if (moduleName) {
                        toReExport[moduleName] ||= []
                        toReExport[moduleName].push(expName)
                      }
                    }

                    let forceExports = ``

                    // lets handle export * as since es-module-lexer doesn't :/
                    let found = 0
                    for (const line of code.split('\n')) {
                      if (line.startsWith('export * from')) {
                        const [_, exportedName] =
                          line.match(/export \* from [\'\"]([^\'\"]+)[\'\"]/) || []
                        if (exportedName) {
                          found++
                          const name = `__vxrnExp${found}`
                          forceExports += `
                            import * as ${name} from '${exportedName}';
                            globalThis.__forceExport${name} = ${name}
                            Object.assign(exports, globalThis.__forceExport${name});
                          `
                          continue
                        }
                      }
                    }

                    forceExports += Object.keys(toReExport)
                      .map((path) => {
                        const exportedNames = toReExport[path]

                        found++
                        const name = `__vxrnExp${found}`
                        return `
                          import * as ${name} from '${path}';
                          globalThis.__forceExport${name} = [${exportedNames.map((n) => (n === 'default' ? name : `${name}.${n}`)).join(',')}]
                        `
                      })
                      .join(';')

                    return {
                      code: code + '\n' + forceExports,
                      moduleSideEffects: 'no-treeshake',
                    }
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
              conditions,
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
              conditions,
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

function getAllImportedIdentifiers(importStatement: string): string[] {
  const importRegex = /{([^}]+)}/
  const match = importStatement.match(importRegex)

  if (!match) {
    return []
  }

  const imports = match[1]

  return imports
    .split(',')
    .map((name) => {
      const parts = name.split(/\s+as\s+/)
      return parts[parts.length - 1].trim()
    })
    .filter(Boolean)
}

/**
 * List of reserved words in JS. From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words.
 */
const RESERVED_WORDS = new Set([
  'toString',

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
])
