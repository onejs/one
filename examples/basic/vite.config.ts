import type { UserConfig } from 'vite'
import { vxs } from 'vxs/vite'
import { tamaguiPlugin } from '@tamagui/vite-plugin'

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },

  plugins: [
    vxs({
      web: {
        defaultRenderMode: 'ssg',
      },

      app: {
        key: 'One',
      },
    }),

    tamaguiPlugin({
      optimize: true,
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      outputCSS: './features/styles/tamagui.css',
    }),
  ],
} satisfies UserConfig
