import { tamaguiPlugin } from '@tamagui/vite-plugin'
import type { UserConfig } from 'vite'
import { one, resolvePath } from 'one/vite'

export default {
  resolve: {
    alias: [
      {
        find: '@docsearch/react',
        replacement: resolvePath('@docsearch/react'),
      },
      // {
      //   find: 'tslib',
      //   replacement: resolve('@tamagui/proxy-worm'),
      // },
    ],
  },

  ssr: {
    noExternal: true,
    external: ['@vxrn/mdx'],
  },

  define: {
    'process.env.TAMAGUI_DISABLE_NO_THEME_WARNING': '"1"',
    'process.env.TAMAGUI_SKIP_THEME_OPTIMIZATION': '"1"',
  },

  plugins: [
    one({
      react: {
        scan: false,
        compiler: process.env.NODE_ENV === 'production',
      },
    }),

    tamaguiPlugin({
      optimize: process.env.NODE_ENV === 'production',
      useReactNativeWebLite: true,
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      outputCSS: './app/tamagui.css',
    }),
  ],
} satisfies UserConfig
