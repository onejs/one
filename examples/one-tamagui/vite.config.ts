import type { UserConfig } from 'vite'
import { one } from 'one/vite'
import { tamaguiPlugin } from '@tamagui/vite-plugin'

export default {
  ssr: {
    optimizeDeps: {
      include: ['react-native-vector-icons', 'react-native-vector-icons/Ionicons'],
    },
  },
  plugins: [
    one({
      web: {
        defaultRenderMode: 'ssg',
      },

      app: {
        // set to the key of your native app
        // will call AppRegistry.registerComponent(app.key)
        key: 'one-example',
      },

      deps: {
        'react-native-vector-icons': {
          '**/*.js': [
            'jsx', // Transpile JSX in .js files
            'flow', // Remove flow types
          ],
        },
      },
    }),

    tamaguiPlugin({
      optimize: true,
      components: ['tamagui'],
      config: './config/tamagui/tamagui.config.ts',
      outputCSS: './app/tamagui.css',
    }),
  ],
} satisfies UserConfig
