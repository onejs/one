import type { VXRNConfig } from 'vxrn'
import { nonjsResolvePlugin } from './vendor/plugins/plugins/vite-plugin-nonjs-resolve'
import { rscEnvPlugin } from './vendor/plugins/plugins/vite-plugin-rsc-env'
import { rscPrivatePlugin } from './vendor/plugins/plugins/vite-plugin-rsc-private'
import { rscManagedPlugin } from './vendor/plugins/plugins/vite-plugin-rsc-managed'
import { rscTransformPlugin } from './vendor/plugins/plugins/vite-plugin-rsc-transform'
import { rscDelegatePlugin } from './vendor/plugins/plugins/vite-plugin-rsc-delegate'
import { resolveConfig } from './vendor/plugins/config'
import { rscIndexPlugin } from './vendor/plugins/plugins/vite-plugin-rsc-index'
import { rscHmrPlugin } from './vendor/plugins/plugins/vite-plugin-rsc-hmr'
import { patchReactRefresh } from './vendor/plugins/plugins/patch-react-refresh'
import react from '@vitejs/plugin-react-swc'

const configSrcDir = 'src'
const configEntriesJs = 'entries.js'

const vConfig = async () => {
  const config = await resolveConfig({})
  return {
    webConfig: {
      cacheDir: 'node_modules/.vite/waku-dev-server',
      base: config.basePath,
      plugins: [
        patchReactRefresh(react()),
        nonjsResolvePlugin(),
        rscEnvPlugin({ config }),
        rscPrivatePlugin(config),
        rscManagedPlugin(config),
        rscIndexPlugin(config),
        rscHmrPlugin(),
      ],
      optimizeDeps: {
        include: ['react-server-dom-webpack/client', 'react-dom'],
        exclude: ['waku'],
        entries: [
          `${config.srcDir}/${config.entriesJs}`.replace(/\.js$/, '.*'),
          // HACK hard-coded "pages"
          `${config.srcDir}/pages/**/*.*`,
        ],
      },
      ssr: {
        external: [
          'waku',
          'waku/client',
          'waku/server',
          'waku/router/client',
          'waku/router/server',
        ],
      },
      server: { middlewareMode: true },
    },
  }
}

export default vConfig
