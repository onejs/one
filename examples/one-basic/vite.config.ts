import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      web: {
        defaultRenderMode: 'ssg',
      },

      // pages, api routes, and middlewares build against one server config
      build: {
        server: { unified: true },
      },

      native: {
        app: {
          name: 'OneBasic',
          icon: {
            source: './public/app-icon.png',
            backgroundColor: '#000000',
          },
          splash: {
            source: './public/splash.png',
            backgroundColor: '#000000',
            width: 200,
          },
          ios: {
            bundleId: 'dev.onestack.starter',
            deploymentTarget: '17.0',
            widgets: {
              appGroup: 'group.dev.onestack.starter',
              kind: 'OneBasicStatus',
              displayName: 'One Status',
              description: 'Shows the latest status from One Basic.',
            },
          },
          android: { applicationId: 'dev.onestack.starter' },
        },
      },
    }),
  ],
})
