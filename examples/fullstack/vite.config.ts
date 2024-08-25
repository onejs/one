import { tamaguiExtractPlugin } from '@tamagui/vite-plugin'
import type { UserConfig } from 'vite'
import { removeReactNativeWebAnimatedPlugin, vxs } from 'vxs/vite'

const PROD = process.env.NODE_ENV === 'production'

// @ts-ignore
if (!import.meta.dirname) {
  throw new Error(`Not on Node 22`)
}

const optimizeInterop = ['expo-splash-screen']

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
      'react-native-svg': '@tamagui/react-native-svg',
    },

    dedupe: [
      'react',
      'react-dom',
      '@tamagui/core',
      '@tamagui/web',
      '@tamagui/animations-moti',
      'tamagui',
      '@tamagui/use-presence',
      'react-native-reanimated',
    ],
  },

  optimizeDeps: {
    include: [
      ...optimizeInterop,
      '@tamagui/animate-presence',
      '@tamagui/presence-child',
      'swr',
      '@supabase/ssr',
      '@tamagui/animations-moti',
      '@tamagui/animations-react-native',
      'is-buffer',
      'extend',
      'minimatch',
      'gray-matter',
      'hsluv',
      'rehype-parse',
      'refractor',
      'glob',
      'reading-time',
      'unified',
    ],
    needsInterop: optimizeInterop,
  },

  build: {
    cssTarget: 'safari15',
  },

  plugins: [
    vxs({
      redirects: [
        // eg:
        // {
        //   source: '/account/subscriptions',
        //   destination: '/account/items',
        //   permanent: false,
        // },
      ],
    }),

    removeReactNativeWebAnimatedPlugin(),

    process.env.TAMAGUI_EXTRACT || PROD
      ? tamaguiExtractPlugin({
          logTimings: true,
        })
      : null,
  ],
} satisfies UserConfig
