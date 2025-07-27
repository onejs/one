import type { UserConfig } from 'vite'
import { one } from 'one/vite'

export default {
  // @ts-ignore - rolldown experimental option
  experimental: {
    enableNativePlugin: true,
  },
  plugins: [
    one({
      web: {
        deploy: 'vercel',
      },

      react: {
        compiler: true,
        // scan: true,
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
