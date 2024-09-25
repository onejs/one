import { vxs } from 'vxs/vite'
import type { UserConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tamaguiPlugin } from '@tamagui/vite-plugin'

export default {
  plugins: [
    vxs({
      zero: true,

      web: {
        defaultRenderMode: 'spa',
      },

      app: {
        key: 'One',
      },
    }),

    tsconfigPaths() as any,

    tamaguiPlugin({
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      optimize: true,
      // outputCSS: './features/styles/tamagui.css',
    }),
  ],
} satisfies UserConfig
