import { vxs } from 'vxs/vite'
import type { UserConfig } from 'vite'

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },

  plugins: [
    vxs(),
    // tamaguiPlugin(),
    // tamaguiExtractPlugin(),
  ],
} satisfies UserConfig
