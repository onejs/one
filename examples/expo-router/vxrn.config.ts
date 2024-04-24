import { tamaguiExtractPlugin, tamaguiPlugin } from '@tamagui/vite-plugin'
import { createFileSystemRouter, clientTreeShakePlugin } from '@vxrn/expo-router/vite'
import type { VXRNConfig } from 'vxrn'

Error.stackTraceLimit = Number.POSITIVE_INFINITY

const extraDepsToOptimize = ['test']

export default {
  // not working yet, for now just use index.jsx
  // entryNative: './src/entry-native.tsx',

  webConfig: {
    ssr: {
      optimizeDeps: {
        include: extraDepsToOptimize,
        needsInterop: extraDepsToOptimize,
      },
    },

    plugins: [
      clientTreeShakePlugin(),
      createFileSystemRouter({
        root: import.meta.dirname,
        routesDir: 'app',
      }),
      tamaguiPlugin(),
      tamaguiExtractPlugin(),
    ],
  },
} satisfies VXRNConfig
