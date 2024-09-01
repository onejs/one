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
      config: 'config/tamagui.config.ts',
      outputCSS: 'public/tamagui.css',
      components: ['tamagui'],
    }),
  ],
} satisfies UserConfig
