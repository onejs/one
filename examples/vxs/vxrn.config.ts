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
        '~': import.meta.dirname,
        'react-native-svg': '@tamagui/react-native-svg',
      },

      dedupe: ['react', 'react-dom', '@tamagui/core', '@tamagui/web'],
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
