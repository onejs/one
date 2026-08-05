import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      web: {
        defaultRenderMode: 'ssg',
        // vite 8.1 experimental bundled dev (rolldown FullBundleDevEnvironment)
        experimentalBundledDev: !!process.env.BUNDLED_DEV,
      },

      // unified build mode — pages, api routes, and middlewares all build
      // against the same SSR server config (same defines, same plugins, same
      // externalization rules) and drops the blanket `ssr.noExternal: true`.
      // this is the direction One is moving; in the next major it becomes the
      // default and `build.api` / `build.middleware` lose their separate
      // config surfaces.
      build: {
        server: { unified: true },
      },

      ...(process.env.TEST_METRO && {
        native: {
          bundler: 'metro',
        },
      }),
    }),
  ],
})
