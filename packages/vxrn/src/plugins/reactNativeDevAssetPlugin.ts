import path from 'node:path'
import FSExtra from 'fs-extra'

import type { Plugin } from 'vite'
import colors from 'picocolors'
import { isNativeEnvironment } from '../utils/environmentUtils'

/** See: https://github.com/facebook/metro/blob/v0.80.10/packages/metro-config/src/defaults/defaults.js#L18-L52 */
const DEFAULT_ASSET_EXTS = [
  // Image formats
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'png',
  'psd',
  'svg',
  'webp',
  // Video formats
  'm4v',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'webm',
  // Audio formats
  'aac',
  'aiff',
  'caf',
  'm4a',
  'mp3',
  'wav',
  // Document formats
  'html',
  'pdf',
  'yaml',
  'yml',
  // Font formats
  'otf',
  'ttf',
  // Archives (virtual files)
  'zip',
]

const IMAGE_ASSET_EXTS = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'psd', 'svg', 'tiff', 'ktx']
const IMAGE_ASSET_EXTS_SET = new Set(IMAGE_ASSET_EXTS)

const ASSET_DEST_DIR = 'assets' // TODO: `/assets` might be too common, consider using a more unique prefix.

type ReactNativeDevAssetPluginConfig = {
  projectRoot: string
  /** The list file extensions to be treated as assets. Assets are recognized by their extension. */
  assetExts?: string[]
  /** Defaults to `'dev'`. */
  mode?: 'dev' | 'prod'
  /** Only needed while building the release bundle. */
  assetsDest?: string
}

export function reactNativeDevAssetPlugin(options: ReactNativeDevAssetPluginConfig): Plugin {
  const { projectRoot, assetExts = DEFAULT_ASSET_EXTS } = options

  const assetExtsRegExp = new RegExp(`\\.(${assetExts.join('|')})$`)
  const isAssetFile = (id: string) => assetExtsRegExp.test(id)

  async function getAssetData(id) {
    /** Asset path relative to the project root. */
    const relativeAssetPath = path.relative(projectRoot, id) // TODO: Handle assets that are outside the project root.

    let assetUrlPath = relativeAssetPath
    // On Windows, change backslashes to slashes to get proper URL path from file path.
    if (path.sep === '\\') {
      assetUrlPath = assetUrlPath.replaceAll('\\', '/')
    }

    const relativeAssetDir = path.dirname(relativeAssetPath)
    const assetBasename = path.basename(relativeAssetPath)
    const assetExt = path.extname(assetBasename).slice(1)
    const assetName = assetBasename.slice(
      0,
      -((assetExt.length + 1) /* for the dot before the extension */)
    )

    const assetData = {
      __packager_asset: true,
      fileSystemLocation: path.dirname(id),
      relativeFileSystemLocation: relativeAssetDir,
      httpServerLocation: `/${ASSET_DEST_DIR}/${assetUrlPath.slice(0, -assetBasename.length)}`, // TODO: `/assets` might be too common, consider using a unique prefix.
      scales: [1], // TODO
      name: assetName,
      type: assetExt,
    }

    return assetData
  }

  return {
    name: 'vxrn:react-native-dev-asset',
    enforce: 'pre',

    resolveId(source, importer, options) {
      if (!isNativeEnvironment(this.environment)) return
      if (!isAssetFile(source)) return

      // TODO: May need to handle platform specific extensions here.
    },

    async load(id, _options) {
      if (!isNativeEnvironment(this.environment)) return
      if (!isAssetFile(id)) return

      const assetData = await getAssetData(id)

      if (options.mode === 'prod' && options.assetsDest) {
        // Copy the asset to the assetsDest directory.
        // TODO: Handle different scales.
        const assetsDestDir = path.join(
          options.assetsDest,
          ASSET_DEST_DIR,
          assetData.relativeFileSystemLocation
        )
        await FSExtra.ensureDir(assetsDestDir)
        await FSExtra.copyFile(id, path.join(assetsDestDir, `${assetData.name}.${assetData.type}`))
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
        if (!req.url?.startsWith(`/${ASSET_DEST_DIR}/`)) {
          return next()
        }

        // TODO: Better way to do this?
        const url = new URL('http://example.com' + req.url)
        const pathname = url.pathname // '/assets/src/assets/one-ball.png.'
        const assetPath = './' + pathname.slice('/assets/'.length).replace(/\.*$/, '') // './src/assets/one-ball.png'

        try {
          const asset = await FSExtra.readFile(assetPath)

          res.setHeader('content-type', 'image/png')
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
            e instanceof Error && (e as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500
          res.end()
        }
      })
    },
  }
}

function isAssetTypeAnImage(
  /** Normally an file extension without the leading dot. */
  type: string
) {
  return IMAGE_ASSET_EXTS_SET.has(type)
}
