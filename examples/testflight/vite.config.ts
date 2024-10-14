import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { join } from 'node:path'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

const rnbtp = join(
  import.meta.dirname,
  'node_modules/react-native-bottom-tabs/lib/module/react-navigation/index.js'
)

export default {
  resolve: {
    alias: {
      'react-native-bottom-tabs/react-navigation': rnbtp,
    },
  },

  plugins: [
    one({
      web: {
        deploy: 'vercel',
        defaultRenderMode: 'ssg',
      },

      app: {
        key: 'one-example',
      },
    }),

    tamaguiPlugin({
      optimize: true,
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      outputCSS: './code/styles/tamagui.css',
    }),
  ],
} satisfies UserConfig
