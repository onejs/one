import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    one({
      react: {
        compiler: true,
        scan: true,
      },

      web: {
        defaultRenderMode: 'spa',
      },
    }),

    tamaguiPlugin({
      optimize: true,
      disableServerOptimization: process.env.NODE_ENV === 'development',
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
    }),
  ],
} satisfies UserConfig
