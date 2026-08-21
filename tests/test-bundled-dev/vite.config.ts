import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    one({
      // vite's experimental full-bundle dev mode. it serves the client as one
      // rolldown bundle instead of per-module esm, so it exercises a completely
      // different dev pipeline than the rest of the suite.
      web: {
        experimentalBundledDev: true,
      },
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
    }),
  ],
} satisfies UserConfig
