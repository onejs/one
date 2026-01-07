import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  ssr: {
    noExternal: true,
    external: ['@vxrn/mdx'],
  },

  plugins: [
    one({
      native: {
        bundler: 'metro',
      },
    }),
  ],
} satisfies UserConfig
