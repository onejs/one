import { swcTransform, transformForBuild } from '@vxrn/vite-native-swc'
import { parse } from 'es-module-lexer'
import { connectedNativeClients } from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'
import { entryRoot } from '../utils/getReactNativeBundle'
import { getVitePath } from '../utils/getVitePath'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { isWithin } from '../utils/isWithin'
import { createIdResolver, type ResolveFn, type Plugin } from 'vite'
import { conditions } from './reactNativeCommonJsPlugin'
import { getReactNativeResolvedConfig } from '../utils/getReactNativeConfig'

export function reactNativeHMRPlugin({
  root,
  assetExts,
  mode,
}: VXRNOptionsFilled & { assetExts: string[] }) {
  let idResolver: ReturnType<typeof createIdResolver>

  const assetExtsRegExp = new RegExp(`\\.(${assetExts.join('|')})$`)
  const isAssetFile = (id: string) => assetExtsRegExp.test(id)

  return {
    name: 'vxrn:native-hmr-transform',

    // TODO see about moving to hotUpdate
    // https://deploy-preview-16089--vite-docs-main.netlify.app/guide/api-vite-environment.html#the-hotupdate-hook
    async handleHotUpdate({ read, modules, file, server }) {
      if (!idResolver) {
        const rnConfig = getReactNativeResolvedConfig()
        if (!rnConfig) {
          // they are only running web app not native
          return
        }

        // for some reason rnConfig.resolve.conditions is empty array
        const resolverConfig = {
          conditions,
          mainFields: rnConfig.resolve.mainFields,
          extensions: rnConfig.resolve.extensions,
        }
        idResolver = createIdResolver(rnConfig, resolverConfig)
      }

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
        if (isAssetFile(id)) {
          // TODO: Handle asset updates.
          return
        }

        const code = await read()

        // got a weird pre compiled file on startup
        if (code.startsWith(`'use strict';`)) {
          return
        }

        if (!code) {
          return
        }

        let source = code

        // we have to remove jsx before we can parse imports...
        source = (await transformForBuild(id, source))?.code || ''

        const environment = server.environments.ios // TODO: android? How can we get the current environment here?

        // TODO: This is a hacky way to make HMR route files work, since if we don't run through the `clientTreeShakePlugin`, the source code might include imports to server side stuff (typically used inside `loader` functions) that will break the HMR update. Ideally, we should go though all user plugins for HMR updates.
        const clientTreeShakePlugin = environment.plugins.find(
          (p) => p.name === 'vxrn:client-tree-shake'
        )
        if (clientTreeShakePlugin) {
          let clientTreeShakePluginTransformFn = (clientTreeShakePlugin as any).transform
          if (typeof clientTreeShakePluginTransformFn === 'function') {
            try {
              clientTreeShakePluginTransformFn = clientTreeShakePluginTransformFn.bind({
                environment,
              })
              const result = await clientTreeShakePluginTransformFn(source, id, {})
              if (result) {
                source = result.code
              }
            } catch (e) {
              console.warn(`vxrn:client-tree-shake failed on HMR: ${e}`)
            }
          }
        }

        const importsMap = {}

        // parse imports of modules into ids:
        // eg `import x from '@tamagui/core'` => `import x from '/me/node_modules/@tamagui/core/index.js'`
        const [imports] = parse(source)

        let accumulatedSliceOffset = 0

        for (const specifier of imports) {
          const { n: importName, s: start } = specifier

          if (importName) {
            const environment = server.environments.ios // TODO: android

            // TODO: maybe we only need `resolverWithPlugins`?
            const resolver: ResolveFn = idResolver.bind(null, environment)
            const resolverWithPlugins: ResolveFn = async (id, importer) => {
              // Need this since `idResolver` will not run through user plugins, but we might need plugins like `vite-tsconfig-paths` to work if they are used
              const resolvedIdData = await environment.pluginContainer.resolveId(id, importer)
              return resolvedIdData?.id
            }

            const id = await getVitePath(entryRoot, file, importName, resolver, resolverWithPlugins)
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
              production: mode === 'production',
            })
          )?.code || ''

        if (!source) {
          throw '❌ no source'
        }

        const hotUpdateSource = `exports = ((exports) => {
          const require = createRequire("${id}", ${JSON.stringify(importsMap, null, 2)})
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
