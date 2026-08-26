import { createHash } from 'node:crypto'
import path from 'node:path'
import FSExtra from 'fs-extra'

import type { Plugin, ResolvedConfig } from 'vite'
import { getMimeType } from 'hono/utils/mime'
import colors from 'picocolors'
import { isNativeEnvironment } from '../utils/environmentUtils'

const ASSET_DEST_DIR = 'assets'
/** `/assets` is too common and might conflict with web, using another path for dev server in development. */
const DEV_ASSET_DEST_PATH = '__vxrn_dev_native_assets'
const devAssetFiles = new Map<string, string>()

export async function getReactNativeAssetData({
  id,
  root,
  mode,
}: {
  id: string
  root: string
  mode: 'dev' | 'prod'
}) {
  const relativeAssetPath = path.relative(root, id)
  let assetUrlPath = relativeAssetPath
  if (path.sep === '\\') {
    assetUrlPath = assetUrlPath.replaceAll('\\', '/')
  }

  const relativeAssetDir = path.dirname(relativeAssetPath)
  const assetBasename = path.basename(relativeAssetPath)
  const assetExt = path.extname(assetBasename).slice(1)
  const assetName = assetBasename.slice(0, -(assetExt.length + 1))
  const bytes = await FSExtra.readFile(id)
  const hash = createHash('md5').update(bytes).digest('hex')

  let httpServerLocation: string
  if (mode === 'dev') {
    const sourceId = createHash('sha256').update(id).digest('hex')
    devAssetFiles.set(sourceId, id)
    httpServerLocation = `/${DEV_ASSET_DEST_PATH}/${sourceId}`
  } else {
    const assetUrlDir = assetUrlPath.slice(0, -(assetBasename.length + 1))
    httpServerLocation = `/${ASSET_DEST_DIR}/${assetUrlDir}`
  }

  return {
    __packager_asset: true,
    fileSystemLocation: path.dirname(id),
    relativeFileSystemLocation: relativeAssetDir,
    httpServerLocation,
    scales: [1],
    name: assetName,
    type: assetExt,
    hash,
  }
}

type ReactNativeDevAssetPluginConfig = {
  /** The list file extensions to be treated as assets. Assets are recognized by their extension. */
  assetExts: string[]
  /** Defaults to `'dev'`. */
  mode?: 'dev' | 'prod'
  /** Only needed while building the release bundle. */
  assetsDest?: string
}

export function reactNativeDevAssetPlugin(
  options: ReactNativeDevAssetPluginConfig
): Plugin {
  const { assetExts } = options
  const mode = options.mode ?? 'dev'

  const assetExtsRegExp = new RegExp(`\\.(${assetExts.join('|')})$`)
  const isAssetFile = (id: string) => assetExtsRegExp.test(id)

  let config: ResolvedConfig

  return {
    name: 'vxrn:react-native-dev-asset',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    // resolveId(source, importer, options) {
    //   if (!isNativeEnvironment(this.environment)) return
    //   if (!isAssetFile(source)) return

    //   // TODO: May need to handle platform specific extensions here.
    // },

    async load(id, _options) {
      if (!isNativeEnvironment(this.environment)) return
      if (!isAssetFile(id)) return

      const assetData = await getReactNativeAssetData({ id, root: config.root, mode })

      if (mode === 'prod' && options.assetsDest) {
        // Copy the asset to the assetsDest directory.
        // TODO: Handle different scales.
        const assetsDestDir = path.join(
          options.assetsDest,
          ASSET_DEST_DIR,
          assetData.relativeFileSystemLocation
        )
        await FSExtra.ensureDir(assetsDestDir)
        await FSExtra.copyFile(
          id,
          path.join(assetsDestDir, `${assetData.name}.${assetData.type}`)
        )
      }

      /**
       * Note that originally we would have to import the AssetRegistry from '@react-native/assets-registry/registry' like so:
       *
       * ```js
       * import * as RNAssetsRegistry from '@react-native/assets-registry/registry';
       * ```
       *
       * But with prebuilt and patched react-native, we can just import it from 'react-native'.
       */
      const assetModuleCode = `
import { AssetRegistry } from 'react-native';

export const asset = AssetRegistry.registerAsset(${JSON.stringify(assetData, null, 2)});

export default asset;
        `

      return assetModuleCode
    },

    /**
     * Extend the dev server to serve assets during development.
     */
    configureServer(server) {
      const { logger } = server.config
      const defaultLogOptions = { timestamp: true }

      // Add a middleware to Vite's internal Connect server to handle asset requests from the React Native development app.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(`/${DEV_ASSET_DEST_PATH}/`)) {
          return next()
        }

        const url = new URL('http://example.com' + req.url)
        const pathname = url.pathname
        const sourceId = pathname
          .slice(`/${DEV_ASSET_DEST_PATH}/`.length)
          .split('/')[0]
        const assetPath = sourceId ? devAssetFiles.get(sourceId) : undefined

        if (!assetPath) {
          res.statusCode = 404
          res.end()
          return
        }

        try {
          const asset = await FSExtra.readFile(assetPath)

          res.setHeader('content-type', getMimeType(assetPath) || 'application/octet-stream')
          res.write(asset)
          res.end()
        } catch (e) {
          logger.error(
            colors.red(
              `[vxrn] Failed to serve asset: ${assetPath}: ${e instanceof Error ? e.message : 'unknown error'}`
            ),
            defaultLogOptions
          )

          res.statusCode =
            e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT' ? 404 : 500
          res.end()
        }
      })
    },
  }
}
