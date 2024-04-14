import { tamaguiPlugin } from '@tamagui/vite-plugin'
import type { VXRNConfig } from 'vxrn'

export default {
  // not working yet, for now just use index.jsx
  // entryNative: './src/entry-native.tsx',

  webConfig: {
    plugins: [
      tamaguiPlugin({
        components: ['@tamagui/core'],
        config: 'src/tamagui.config.ts',
      }),
    ],
  },
} satisfies VXRNConfig
