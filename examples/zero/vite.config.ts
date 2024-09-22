import { one } from 'one/vite'
import type { UserConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default {
  plugins: [
    one({
      zero: true,

      web: {
        defaultRenderMode: 'spa',
      },

      app: {
        key: 'One',
      },
    }),

    tsconfigPaths(),
  ],
} satisfies UserConfig
