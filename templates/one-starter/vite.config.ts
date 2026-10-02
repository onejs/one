import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import { defineConfig } from 'vite'
import { APP_NAME, APP_SCHEME, APP_ID } from './appIdentity.ts'

export default defineConfig({
  server: { port: 8081 },
  ssr: { external: ['@rocicorp/zero', 'on-zero', 'better-auth', 'pg'] },
  plugins: [
    tamaguiPlugin(),
    one({
      setupFile: {
        client: './src/setupClient.ts',
        native: './src/setupNative.ts',
      },
      router: { linking: { scheme: APP_SCHEME } },
      web: { defaultRenderMode: 'spa' },
      build: { server: { unified: true } },
      native: {
        bundler: 'metro',
        app: {
          name: APP_NAME,
          scheme: APP_SCHEME,
          icon: { source: './assets/icon.png', backgroundColor: '#e6dac1' },
          splash: { source: './assets/logo.png', backgroundColor: '#e6dac1', width: 80 },
          ios: { bundleId: APP_ID, deploymentTarget: '17.0' },
          android: { applicationId: APP_ID },
        },
      },
    }),
  ],
})
