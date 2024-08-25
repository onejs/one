import { vxs } from 'vxs/vite'
import type { UserConfig } from 'vite'

export default {
  resolve: {
    alias: {
      '~': import.meta.dirname,
    },
  },

  plugins: [
    vxs({
      // app: {
      //   key: 'test',
      // },
    }),
    // tamaguiPlugin(),
    // tamaguiExtractPlugin(),
  ],
} satisfies UserConfig
