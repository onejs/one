import type { UserConfig } from 'vite'
import { one } from 'one/vite'

export default {
  plugins: [
    one({
      server: {
        platform: 'vercel',
      },
    }),
  ],
} satisfies UserConfig
