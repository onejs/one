import { tamaguiExtractPlugin } from '@tamagui/vite-plugin'
import type { UserConfig } from 'vite'
import { removeReactNativeWebAnimatedPlugin, vxs } from 'vxs/vite'

const PROD = process.env.NODE_ENV === 'production'

// @ts-ignore
if (!import.meta.dirname) {
  throw new Error(`Not on Node 22`)
}

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },

    dedupe: [
      'react',
      'react-dom',
      '@tamagui/core',
      '@tamagui/web',
      '@tamagui/animations-moti',
      '@tamagui/toast',
      'tamagui',
      '@tamagui/use-presence',
      'react-native-reanimated',
    ],
  },

  plugins: [
    vxs({
      web: {
        defaultRenderMode: 'ssg',
      },

      // this is a simpler way to optimize deps on server
      deps: {
        swr: true,
        '@supabase/ssr': true,
        'is-buffer': true,
        extend: true,
        minimatch: true,
        'gray-matter': true,
        hsluv: true,
        'rehype-parse': true,
        refractor: true,
        glob: true,
        'reading-time': true,
        unified: true,
      },
    }),

    removeReactNativeWebAnimatedPlugin(),

    process.env.TAMAGUI_EXTRACT || PROD
      ? tamaguiExtractPlugin({
          logTimings: true,
        })
      : null,
  ],
} satisfies UserConfig
