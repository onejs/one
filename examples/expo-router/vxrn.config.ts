import type { TamaguiBuildOptions } from '@tamagui/core'
import { tamaguiExtractPlugin, tamaguiPlugin } from '@tamagui/vite-plugin'
import type { VXRNConfig } from 'vxrn'

const tamaguiConfig = {
  components: ['@tamagui/core'],
  config: 'src/tamagui.config.ts',
  outputCSS: './public/tamagui.css',
} satisfies TamaguiBuildOptions

export default {
  // not working yet, for now just use index.jsx
  // entryNative: './src/entry-native.tsx',

  webConfig: {
    plugins: [
      //
      tamaguiPlugin(tamaguiConfig),
      tamaguiExtractPlugin(tamaguiConfig),
    ],
  },
} satisfies VXRNConfig
