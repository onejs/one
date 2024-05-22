// import { tamaguiExtractPlugin, tamaguiPlugin } from '@tamagui/vite-plugin'
import { getVitePlugins, build, serve } from 'vxs/vite'
import type { VXRNConfig } from 'vxrn'

const extraDepsToOptimize = ['test']

export default {
  webConfig: {
    ssr: {
      optimizeDeps: {
        include: extraDepsToOptimize,
        needsInterop: extraDepsToOptimize,
      },
    },

    resolve: {
      alias: {
        // if you're using Node 20.11.0 or later, you can use `import.meta.dirname`
        '~': import.meta.url.split('/').slice(1, -1).join('/'),
        'react-native-svg': '@tamagui/react-native-svg',
      },
    },

    plugins: [
      ...getVitePlugins({
        root: 'app',
      }),
      // tamaguiPlugin(),
      // tamaguiExtractPlugin(),
    ],
  },

  async afterBuild(...args) {
    await build(...args)
  },

  serve(options, app) {
    serve(options, app)
  },
} satisfies VXRNConfig
