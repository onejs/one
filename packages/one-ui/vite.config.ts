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
      zero: true,

      web: {
        defaultRenderMode: 'spa',
      },
    }),
  ],
} satisfies UserConfig
