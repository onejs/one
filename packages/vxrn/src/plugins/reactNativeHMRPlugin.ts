import { swcTransform, transformForBuild } from '@vxrn/vite-native-swc'
import { parse } from 'es-module-lexer'
import { connectedNativeClients } from '../utils/connectedNativeClients'
import type { VXRNConfigFilled } from '../utils/getOptionsFilled'
import { entryRoot } from '../utils/getReactNativeBundle'
import { getVitePath } from '../utils/getVitePath'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { isWithin } from '../utils/isWithin'
import type { Plugin } from 'vite'

export function reactNativeHMRPlugin({ root }: VXRNConfigFilled) {
  return {
    name: 'client-transform',

    // TODO see about moving to hotUpdate
    // https://deploy-preview-16089--vite-docs-main.netlify.app/guide/api-vite-environment.html#the-hotupdate-hook
    async handleHotUpdate({ read, modules, file }) {
      try {
        if (!isWithin(root, file)) {
          return
        }
        if (!connectedNativeClients) {
          return
        }

        const [module] = modules
        if (!module) return

        const id = module?.url || file.replace(root, '')

        const code = await read()

        // got a weird pre compiled file on startup
        if (code.startsWith(`'use strict';`)) return

        if (!code) {
          return
        }

        let source = code

        // we have to remove jsx before we can parse imports...
        source = (await transformForBuild(id, source))?.code || ''

        const importsMap = {}

        // parse imports of modules into ids:
        // eg `import x from '@tamagui/core'` => `import x from '/me/node_modules/@tamagui/core/index.js'`
        const [imports] = parse(source)

        let accumulatedSliceOffset = 0

        for (const specifier of imports) {
          const { n: importName, s: start } = specifier

          if (importName) {
            const id = await getVitePath(entryRoot, file, importName)
            if (!id) {
              console.warn('???')
              continue
            }

            importsMap[id] = id.replace(/^(\.\.\/)+/, '')

            // replace module name with id for hmr
            const len = importName.length
            const extraLen = id.length - len
            source =
              source.slice(0, start + accumulatedSliceOffset) +
              id +
              source.slice(start + accumulatedSliceOffset + len)
            accumulatedSliceOffset += extraLen
          }
        }

        // then we have to convert to commonjs..
        source =
          (
            await swcTransform(id, source, {
              mode: 'serve-cjs',
            })
          )?.code || ''

        if (!source) {
          throw '❌ no source'
        }

        importsMap['currentPath'] = id

        const hotUpdateSource = `exports = ((exports) => {
          const require = createRequire(${JSON.stringify(importsMap, null, 2)})
          ${source
            .replace(`import.meta.hot.accept(() => {})`, ``)
            // replace import.meta.glob with empty array in hot reloads
            .replaceAll(/import.meta.glob\(.*\)/gi, `globalThis['__importMetaGlobbed'] || {}`)};
          return exports })({})`

        if (process.env.DEBUG) {
          console.info(`Sending hot update`, hotUpdateSource)
        }

        hotUpdateCache.set(id, hotUpdateSource)
      } catch (err) {
        console.error(`Error processing hmr update:`, err)
      }
    },
  } satisfies Plugin
}
