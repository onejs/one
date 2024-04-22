import type { UserConfig } from 'vite'

// essentially base web config not base everything

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): UserConfig {
  return {
    mode,
    define: {
      __DEV__: `${mode === 'development'}`,
      'process.env.NODE_ENV': `"${mode}"`,
    },
    resolve: {
      alias: {
        'react-native': 'react-native-web-lite',
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
