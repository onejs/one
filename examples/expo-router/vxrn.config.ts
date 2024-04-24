import { createFileSystemRouter } from '@vxrn/expo-router/vite'
import type { VXRNConfig } from 'vxrn'

Error.stackTraceLimit = Number.POSITIVE_INFINITY

export default {
  // not working yet, for now just use index.jsx
  // entryNative: './src/entry-native.tsx',

  webConfig: {
    plugins: [
      createFileSystemRouter({
        root: __dirname,
        routesDir: 'app',
      }),
      //
      // tamaguiPlugin(),
      // tamaguiExtractPlugin(),
    ],
  },
} satisfies VXRNConfig
