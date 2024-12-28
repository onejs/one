import type { UserConfig } from 'vite'
import { one } from 'one/vite'
import { tamaguiPlugin } from '@tamagui/vite-plugin'

export default {
  plugins: [
    one({
      react: {
        compiler: true,
      },

      web: {
        defaultRenderMode: 'ssg',
      },

      app: {
        // set to the key of your native app
        // will call AppRegistry.registerComponent(app.key)
        key: 'one-example',
      },
    }),

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === 'production',
      components: ['tamagui'],
      config: './config/tamagui/tamagui.config.ts',
      outputCSS: './app/tamagui.css',
    }),
  ],
} satisfies UserConfig
