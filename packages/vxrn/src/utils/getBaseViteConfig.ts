import reactSwcPlugin from '@vitejs/plugin-react-swc'
import type { UserConfig } from 'vite'

// essentially base web config not base everything

export function getBaseViteConfig({ mode }: { mode: 'development' | 'production' }): UserConfig {
  const sharedWebConfig = {
    resolve: {
      alias: {
        'react-native': 'react-native-web',
        'react-native-safe-area-context': '@vxrn/safe-area',
      },
    },
  } satisfies UserConfig

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
      },

      // TODO auto dedupe all include optimize deps?
      dedupe: [
        'vxs',
        '@vxrn/safe-area',
        'react',
        'react-dom',
        'react-dom/client',
        'react-native-web',
        '@tamagui/core',
        '@tamagui/web',
      ],
    },

    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },

    environments: {
      web: {
        ...sharedWebConfig,
      },

      ssr: {
        ...sharedWebConfig,
      },
    },
  }
}
