import { tamaguiExtractPlugin } from '@tamagui/vite-plugin'
import type { UserConfig } from 'vite'
import { vxs } from 'vxs/vite'

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },

  plugins: [
    vxs(),
    tamaguiExtractPlugin({
      disableExtraction: true,
      config: 'config/tamagui.config.ts',
      outputCSS: 'features/styles/tamagui.css',
      components: ['tamagui'],
    }),
  ],
} satisfies UserConfig
