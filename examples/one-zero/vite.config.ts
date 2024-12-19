import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  optimizeDeps: {
    include: ['@rocicorp/zero', 'pg'],
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
        pg: 'interop',
      },
    }),

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === 'production',
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './app/tamagui.css',
    }),
  ],
} satisfies UserConfig
