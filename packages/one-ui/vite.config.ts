import type { UserConfig } from 'vite'
import { vxs } from 'vxs/vite'

export default {
  plugins: [
    vxs({
      zero: true,

      web: {
        defaultRenderMode: 'spa',
      },
    }),
  ],
} satisfies UserConfig
