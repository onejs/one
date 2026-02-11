import { one } from 'one/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { UserConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isSpaShellCase = process.env.ONE_ROUTER_ROOT?.includes('spa-shell')

export default {
  root: __dirname,

  ssr: {
    noExternal: true,
  },

  plugins: [
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
      web: {
        ...(isSpaShellCase && {
          renderRootLayout: 'always-static',
        }),
      },
    }),
  ],
} satisfies UserConfig
