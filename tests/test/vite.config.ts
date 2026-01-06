import { one } from 'one/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { UserConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  root: __dirname,

  ssr: {
    noExternal: true,
    external: ['@vxrn/mdx'],
  },

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

      native: {
        bundler: 'metro',
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
