import { transformSWC, transformSWCStripJSX } from '@vxrn/compiler'
import { parse } from 'es-module-lexer'
import FSExtra from 'fs-extra'
import { connectedNativeClients } from '../utils/connectedNativeClients'
import type { VXRNOptionsFilled } from '../utils/getOptionsFilled'
import { entryRoot } from '../utils/getReactNativeBundle'
import { getVitePath } from '../utils/getVitePath'
import { hotUpdateCache } from '../utils/hotUpdateCache'
import { isWithin } from '../utils/isWithin'
import { createIdResolver, type ResolveFn, type Plugin, EnvironmentModuleGraph } from 'vite'
import { conditions } from './reactNativeCommonJsPlugin'
import { getReactNativeResolvedConfig } from '../utils/getReactNativeConfig'
import { filterPluginsForNative } from '../utils/filterPluginsForNative'

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
      const environment = server.environments.ios // TODO: android? How can we get the current environment here?

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

        let id = (module?.url || file.replace(root, '')).replace('/@id', '')
        if (id[0] !== '/') {
          id = `/${id}`
        }

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
        try {
          // We create a new plugin container to ensure some plugins are filtered out,
          // since `pluginContainer.getSortedPlugins()` is using a cached that we
          // can't access thus can't make sure the cached plugins are filtered.
          const pluginContainerForTransform: typeof environment.pluginContainer = new (
            environment.pluginContainer.constructor as any
          )(
            environment,
            filterPluginsForNative(environment.plugins, { isNative: true }).filter(
              (p) =>
                p.name !==
                'vite:import-analysis' /* will cause `ERR_OUTDATED_OPTIMIZED_DEP` error */
            ),
            server.watcher
          )
          const transformResult = await pluginContainerForTransform.transform(source, file)
          source = transformResult.code
        } catch (e) {
          console.warn(`Error transforming source for HMR: ${e}. Retrying without plugins.`)
          source = (await transformSWCStripJSX(id, source))?.code || ''
        }

        // TODO: This is a hacky way to make HMR route files work, since if we don't run through the `clientTreeShakePlugin`, the source code might include imports to server side stuff (typically used inside `loader` functions) that will break the HMR update. Ideally, we should go though all user plugins for HMR updates.
        const clientTreeShakePlugin = environment.plugins.find((p) =>
          p.name.endsWith('client-tree-shake')
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
              console.warn(`client-tree-shake failed on HMR: ${e}`)
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
            // TODO: maybe we only need `resolverWithPlugins`?
            const resolver: ResolveFn = idResolver.bind(null, environment)
            const resolverWithPlugins: ResolveFn = async (id, importer) => {
              // Need this since `idResolver` will not run through user plugins, but we might need plugins like `vite-tsconfig-paths` to work if they are used
              const resolvedIdData = await environment.pluginContainer.resolveId(id, importer)
              return resolvedIdData?.id
            }

            let id = await getVitePath(entryRoot, file, importName, resolver, resolverWithPlugins)
            if (!id) {
              console.warn('???')
              continue
            }

            // It seems that it's not possible for Vite to use customized extensions for resolving imports from package.json entry (see: https://github.com/vitejs/vite/blob/v6.0.0-beta.2/packages/vite/src/node/plugins/resolve.ts#L1018),
            // so we need to manually check if the file with `.native.js` extension exists, and use it if it does.
            // @zetavg: We need to check how this is done during bundling, make sure it's consistent and probably merge the logic.
            const nativePath = id.replace(/(.m?js)/, '.native.js')
            try {
              if (nativePath !== id && (await FSExtra.stat(nativePath)).isFile()) {
                id = nativePath
              }
            } catch (e) {}

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
            await transformSWC(id, source, {
              mode: 'serve-cjs',
              environment: 'ios',
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
          console.info(`Sending hot update`, id, hotUpdateSource)
        }

        hotUpdateCache.set(id, hotUpdateSource)
      } catch (err) {
        console.error(`Error processing hmr update:`, err)
      }
    },
  } satisfies Plugin
}
