import type { UserConfig } from 'vite'
import { vxs } from 'vxs/vite'

export default {
  plugins: [
    vxs({
      web: {
        defaultRenderMode: 'ssg',
      },

      app: {
        key: 'One',
      },
    }),
  ],
} satisfies UserConfig
