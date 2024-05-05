// import { tamaguiExtractPlugin, tamaguiPlugin } from '@tamagui/vite-plugin'
import { getVitePlugins } from '@vxrn/router/vite'
import type { VXRNConfig } from 'vxrn'

Error.stackTraceLimit = Infinity

const extraDepsToOptimize = ['test']

export default {
  webConfig: {
    ssr: {
      optimizeDeps: {
        include: extraDepsToOptimize,
        needsInterop: extraDepsToOptimize,
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
} satisfies VXRNConfig
