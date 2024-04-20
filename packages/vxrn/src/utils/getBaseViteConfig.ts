import type { UserConfig } from 'vite'

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): UserConfig {
  return {
    mode,
    define: {
      __DEV__: `${mode === 'development'}`,
      'process.env.NODE_ENV': `"${mode}"`,
    },
    resolve: {
      alias: {
        'react-native': 'react-native-web',
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
}
