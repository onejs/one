import type { UserConfig } from 'vite'
import { one } from 'one/vite'
import { tamaguiPlugin } from '@tamagui/vite-plugin'

export default {
  plugins: [
    one({
      react: {
        compiler: process.env.NODE_ENV === 'production',
      },

      web: {
        defaultRenderMode: 'ssg',
      },

      native: {
        // set to the key of your native app
        // will call AppRegistry.registerComponent(app.key)
        key: 'one-example',
      },
    }),

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === 'production',
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
    }),
  ],
} satisfies UserConfig
