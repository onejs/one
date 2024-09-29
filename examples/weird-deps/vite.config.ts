import { vxs } from 'vxs/vite'
import type { UserConfig } from 'vite'

export default {
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
