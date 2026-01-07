import path from "node:path";
import FSExtra from "fs-extra";

import type { Plugin, ResolvedConfig } from "vite";
import colors from "picocolors";
import { isNativeEnvironment } from "../utils/environmentUtils";

const IMAGE_ASSET_EXTS = ["png", "jpg", "jpeg", "bmp", "gif", "webp", "psd", "svg", "tiff", "ktx"];
const IMAGE_ASSET_EXTS_SET = new Set(IMAGE_ASSET_EXTS);

const ASSET_DEST_DIR = "assets";
/** `/assets` is too common and might conflict with web, using another path for dev server in development. */
const DEV_ASSET_DEST_PATH = "__vxrn_dev_native_assets";

type ReactNativeDevAssetPluginConfig = {
  /** The list file extensions to be treated as assets. Assets are recognized by their extension. */
  assetExts: string[];
  /** Defaults to `'dev'`. */
  mode?: "dev" | "prod";
  /** Only needed while building the release bundle. */
  assetsDest?: string;
};

export function reactNativeDevAssetPlugin(options: ReactNativeDevAssetPluginConfig): Plugin {
  const { assetExts } = options;

  const assetExtsRegExp = new RegExp(`\\.(${assetExts.join("|")})$`);
  const isAssetFile = (id: string) => assetExtsRegExp.test(id);

  let config: ResolvedConfig;

  async function getAssetData(id) {
    const projectRoot = config.root;
    /** Asset path relative to the project root. */
    const relativeAssetPath = path.relative(projectRoot, id); // TODO: Handle assets that are outside the project root.

    let assetUrlPath = relativeAssetPath;
    // On Windows, change backslashes to slashes to get proper URL path from file path.
    if (path.sep === "\\") {
      assetUrlPath = assetUrlPath.replaceAll("\\", "/");
    }

    const relativeAssetDir = path.dirname(relativeAssetPath);
    const assetBasename = path.basename(relativeAssetPath);
    const assetExt = path.extname(assetBasename).slice(1);
    const assetName = assetBasename.slice(
      0,
      -((assetExt.length + 1) /* for the dot before the extension */),
    );

    const assetData = {
      __packager_asset: true,
      fileSystemLocation: path.dirname(id),
      relativeFileSystemLocation: relativeAssetDir,
      httpServerLocation: `/${options.mode === "dev" ? DEV_ASSET_DEST_PATH : ASSET_DEST_DIR}/${assetUrlPath.slice(0, -(assetBasename.length + 1) /* removing the `/filename.ext` at the end */)}`,
      scales: [1], // TODO
      name: assetName,
      type: assetExt,
    };

    return assetData;
  }

  return {
    name: "vxrn:react-native-dev-asset",
    enforce: "pre",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    // resolveId(source, importer, options) {
    //   if (!isNativeEnvironment(this.environment)) return
    //   if (!isAssetFile(source)) return

    //   // TODO: May need to handle platform specific extensions here.
    // },

    async load(id, _options) {
      if (!isNativeEnvironment(this.environment)) return;
      if (!isAssetFile(id)) return;

      const assetData = await getAssetData(id);

      if (options.mode === "prod" && options.assetsDest) {
        // Copy the asset to the assetsDest directory.
        // TODO: Handle different scales.
        const assetsDestDir = path.join(
          options.assetsDest,
          ASSET_DEST_DIR,
          assetData.relativeFileSystemLocation,
        );
        await FSExtra.ensureDir(assetsDestDir);
        await FSExtra.copyFile(id, path.join(assetsDestDir, `${assetData.name}.${assetData.type}`));
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
        `;

      return assetModuleCode;
    },

    /**
     * Extend the dev server to serve assets during development.
     */
    configureServer(server) {
      const { logger } = server.config;
      const defaultLogOptions = { timestamp: true };

      // Add a middleware to Vite's internal Connect server to handle asset requests from the React Native development app.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(`/${DEV_ASSET_DEST_PATH}/`)) {
          return next();
        }

        // TODO: Better way to do this?
        const url = new URL("http://example.com" + req.url);
        const pathname = url.pathname; // '/assets/src/assets/one-ball.png.'
        const assetPath =
          "./" + pathname.slice(`/${DEV_ASSET_DEST_PATH}/`.length).replace(/\.*$/, ""); // './src/assets/one-ball.png'

        try {
          const asset = await FSExtra.readFile(assetPath);

          res.setHeader("content-type", "image/png");
          res.write(asset);
          res.end();
        } catch (e) {
          logger.error(
            colors.red(
              `[vxrn] Failed to serve asset: ${assetPath}: ${e instanceof Error ? e.message : "unknown error"}`,
            ),
            defaultLogOptions,
          );

          res.statusCode =
            e instanceof Error && (e as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
          res.end();
        }
      });
    },
  };
}

function isAssetTypeAnImage(
  /** Normally an file extension without the leading dot. */
  type: string,
) {
  return IMAGE_ASSET_EXTS_SET.has(type);
}
