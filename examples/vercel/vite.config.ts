import type { UserConfig } from 'vite'
import { vxs } from 'vxs/vite'

export default {
  plugins: [
    vxs({
      server: {
        platform: 'vercel',
      },
    }),
  ],
} satisfies UserConfig
