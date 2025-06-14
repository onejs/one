import { mergeConfig, type PluginOption } from 'vite'
import { getBaseViteConfig } from './config/getBaseViteConfigOnly'
import { getAdditionalViteConfig } from './config/getAdditionalViteConfig'
import { getBaseVitePlugins } from './config/getBaseVitePlugins'
import { getReactNativePlugins } from './config/getReactNativePlugins'

/**
 * [Experimental] VxRN as a Vite plugin.
 *
 * Originally, `vxrn` is a CLI tool that uses Vite APIs under the hood.
 * However, by doing so it makes `vxrn` hard to compose with other tools,
 * also we'll need to tangle with things such as user configuration loading.
 *
 * This is a experimental new approach that allows `vxrn` to be used as a Vite plugin.
 */
export function vxrn(): PluginOption {
  return [
    {
      name: 'vxrn-config',
      config: async (config, { mode: modeIn }) => {
        const mode = (() => {
          switch (modeIn) {
            case 'development':
            case 'dev':
              return 'development'
            case 'production':
            case 'prod':
              return 'production'
            default:
              console.warn(
                `[vxrn-config] Unrecognized mode "${modeIn}". Defaulting to "development".`
              )
              return 'development'
          }
        })()

        let root = config.root

        if (!root) {
          root = process.cwd()
          console.warn(
            `[vxrn-config] \`config.root\` is empty, using current working directory: ${root}`
          )
        }

        const baseConfig = await getBaseViteConfig({
          root,
          mode,
        })

        const additionalConfig = getAdditionalViteConfig()
        return mergeConfig(baseConfig, additionalConfig)
      },
    },
    ...getBaseVitePlugins(),
    // ...getReactNativePlugins(),
  ]
}

export default vxrn
