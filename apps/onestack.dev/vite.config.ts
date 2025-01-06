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
      {
        find: 'tabbable',
        replacement: resolvePath('@tamagui/proxy-tabbable'),
      },
      {
        find: '@tamagui/select',
        replacement: resolvePath('@tamagui/proxy-tabbable'),
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
        compiler: process.env.NODE_ENV === 'production',
      },
    }),

    tamaguiPlugin({
      optimize: true,
      disableServerOptimization: process.env.NODE_ENV === 'development',
      useReactNativeWebLite: true,
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      outputCSS: './app/tamagui.css',
      themeBuilder: {
        input: './config/themes.ts',
        output: './config/themesOut.ts',
      },
    }),
  ],
} satisfies UserConfig
