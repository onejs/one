import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { UserConfig } from 'vite'

// essentially base web config not base everything

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): UserConfig {
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
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
}
