import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default {
  plugins: [
    one({
      router: {
        ignoredRouteFiles: ['**/*.should-be-ignored.*'],
      },

      web: {
        deploy: 'vercel',
      },

      react: {
        compiler: true,
      },

      config: {
        tsConfigPaths: {
          // On CI, the mono-repo may be partially installed and built.
          // While the `tsconfig-paths` plugin might attempt to parsing `tsconfig.json`, other apps in
          // the mono-repo and give us errors such as `failed to resolve "extends":"expo/tsconfig.base"`,
          // we will ignore these errors.
          ignoreConfigErrors: true,
        },
      },
    }),
  ],

  resolve: {
    alias: {
      // Stub out native-only modules for web builds
      'react-native-nitro-modules': resolve(__dirname, 'vite-shims/react-native-nitro-modules.js'),
      'react-native-mmkv': resolve(__dirname, 'vite-shims/react-native-mmkv.js'),
    },
  },
} satisfies UserConfig
