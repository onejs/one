import { tamaguiPlugin } from '@tamagui/vite-plugin'
import type { UserConfig } from 'vite'
import { one } from 'one/vite'

export default {
  plugins: [
    one({
      zero: true,

      web: {
        defaultRenderMode: 'spa',
      },

      app: {
        key: 'one-example',
      },
    }),

    tamaguiPlugin({
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      optimize: true,
      // outputCSS: './features/styles/tamagui.css',
    }),
  ],
} satisfies UserConfig
