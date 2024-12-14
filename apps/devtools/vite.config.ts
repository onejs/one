import type { UserConfig } from 'vite'
import { one } from 'one/vite'

export default {
  plugins: [
    one({
      web: {
        defaultRenderMode: 'spa',
      },
    }),
  ],
} satisfies UserConfig
