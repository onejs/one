import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  build: {
    // test that merged css (cssCodeSplit: false) is properly linked in html
    cssCodeSplit: false,
  },
  plugins: [
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
    }),
  ],
} satisfies UserConfig
