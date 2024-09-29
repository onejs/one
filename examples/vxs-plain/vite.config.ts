import { vxs } from 'vxs/vite'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    vxs(),
    // tamaguiPlugin(),
    // tamaguiExtractPlugin(),
  ],
} satisfies UserConfig
