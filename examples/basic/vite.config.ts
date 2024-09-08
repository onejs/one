import type { UserConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { vxs } from 'vxs/vite'

export default {
  plugins: [
    tsconfigPaths({
      projects: [
        'tsconfig.json',
        '/Users/n8/github/mono/tsconfig.json',
        '/Users/n8/github/mono/packages/replicache/tsconfig.json',
      ],
    }),

    vxs({
      app: {
        key: 'One',
      },

      deps: {
        replicache: true,
      },
    }),
  ],
} satisfies UserConfig
