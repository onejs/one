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
      {
        find: 'react-native-svg',
        replacement: resolvePath('@tamagui/react-native-svg'),
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
