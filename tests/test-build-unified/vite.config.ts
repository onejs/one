import { one } from 'one/vite'

export default {
  plugins: [
    one({
      web: {
        deploy: 'cloudflare',
      },
      build: {
        server: {
          // unified build mode: api/middleware share the SSR server config
          // (same defines, plugins, externalization rules) and the blanket
          // ssr.noExternal: true is dropped.
          unified: true,
        },
      },
    }),
  ],
}
