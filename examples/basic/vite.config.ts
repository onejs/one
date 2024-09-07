import type { UserConfig } from 'vite'
import { vxs } from 'vxs/vite'

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },

  plugins: [
    vxs({
      app: {
        key: 'OneDemo',
      },
    }),
  ],
} satisfies UserConfig
