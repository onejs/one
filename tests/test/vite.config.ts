import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    one({
      router: {
        ignoredRouteFiles: ['**/*.should-be-ignored.*'],
      },

      setupFile: {
        client: './setup.ts',
        server: './setup.ts',
        native: './setup.native.ts',
      },

      web: {
        deploy: 'vercel',
        inlineLayoutCSS: true, // Enable to test CSS hydration fix
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

} satisfies UserConfig
