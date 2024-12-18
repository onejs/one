import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  optimizeDeps: {
    include: ['@rocicorp/zero'],
    esbuildOptions: {
      target: 'esnext',
    },
  },

  plugins: [
    one({
      web: {
        defaultRenderMode: 'spa',
      },

      deps: {
        'fast-xml-parser': true,
        'set-cookie-parser': true,
        'ipaddr.js': true,
        'cross-fetch': true,
        pg: true,
      },
    }),

    tamaguiPlugin({
      optimize: true,
      disableServerOptimization: process.env.NODE_ENV === 'development',
      useReactNativeWebLite: true,
      components: ['tamagui'],
      config: './config/tamagui/tamagui.config.ts',
      outputCSS: './app/tamagui.css',
    }),
  ],
} satisfies UserConfig
