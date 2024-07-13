import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { InlineConfig } from 'vite'
import { fixDependenciesPlugin } from '../plugins/fixDependenciesPlugin'

// essentially base web config not base everything

export const dedupe = [
  'vxs',
  '@vxrn/safe-area',
  'react',
  'react-dom',
  'react-dom/client',
  'react-native-web',
  '@tamagui/core',
  '@tamagui/web',
  'react-native-reanimated',
]

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): InlineConfig {
  return {
    mode,

    plugins: [reactSwcPlugin({})],

    define: {
      __DEV__: `${mode === 'development'}`,
      'process.env.NODE_ENV': `"${mode}"`,
    },

    resolve: {
      alias: {
        'react-native': 'react-native-web',
        'react-native-safe-area-context': '@vxrn/safe-area',
      },

      // TODO auto dedupe all include optimize deps?
      dedupe,
    },

    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
}
