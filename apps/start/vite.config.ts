import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  ssr: {
    noExternal: true,
    external: ['@vxrn/mdx'],
  },

  plugins: [
    one({
      react: {
        compiler: process.env.NODE_ENV === 'production',
      },
    }),

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === 'production',
      useReactNativeWebLite: true,
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
    }),
  ],
} satisfies UserConfig
