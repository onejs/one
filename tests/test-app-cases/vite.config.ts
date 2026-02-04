import { one } from 'one/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { UserConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    }),
  ],
} satisfies UserConfig
