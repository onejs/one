import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  build: {
    rolldownOptions: {
      output: {
        // this is what makes the fixture worth having: rolldown wraps modules to
        // guarantee execution order, so a route that another route re-exports from
        // ends up in a chunk that renames its exports
        // (`export { generateStaticParams as r }`). anything reading route exports
        // off the chunk file by name reads undefined.
        strictExecutionOrder: true,
      },
    },
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
