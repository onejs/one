import type { UserConfig } from 'vite'
import { resolveFile } from '../createDevServer'

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): UserConfig {
  return {
    mode,
    define: {
      __DEV__: `${mode === 'development'}`,
      'process.env.NODE_ENV': `"${mode}"`,
    },
    resolve: {
      alias: {
        'react-native': resolveFile('react-native-web-lite'),
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
}
