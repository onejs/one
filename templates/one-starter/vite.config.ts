import { createRequire } from 'node:module'
import { onZeroPlugin } from 'on-zero/vite'
import { one } from 'one/vite'
import { orezSyncCfHostWasm } from 'orez-lite/cloudflare/vite-wasm-loader'
import { orez } from 'orez-lite/vite'

const { tamaguiPlugin } = createRequire(import.meta.url)('@tamagui/vite-plugin')
const portOffset = Number(process.env.PORT_OFFSET || 0)
const webPort = 4200 + portOffset
import { APP_NAME, APP_SCHEME, APP_ID } from './appIdentity.ts'

export default {
  root: import.meta.dirname,

  plugins: [
    ...orezSyncCfHostWasm({ runtime: 'node' }),
    orez(),
    tamaguiPlugin({ config: './tamagui/tamagui.config.ts' }),

    one({
      setupFile: {
        native: './setupNative.ts',
      },

      native: {
        app: {
          name: APP_NAME,
          scheme: APP_SCHEME,
          version: '1.0.0',
          orientation: 'portrait',
          userInterfaceStyle: 'automatic',
          icon: { source: './assets/icon.png', backgroundColor: '#e6dac1' },
          splash: { source: './assets/splash.png', backgroundColor: '#e6dac1' },
          ios: {
            bundleId: APP_ID,
            tablet: false,
            deploymentTarget: '17.0',
          },
          android: {
            applicationId: APP_ID,
            adaptiveIcon: {
              foreground: './assets/adaptive-icon.png',
              backgroundColor: '#e6dac1',
            },
            minSdk: 26,
          },
        },
      },

      web: {
        defaultRenderMode: 'spa',
        skewProtection: 'proactive',
      },

      build: {
        server: {
          unified: true,
        },
      },
    }),

    onZeroPlugin({
      dir: './data',
    }),
  ],

  server: {
    port: webPort,
  },

  // ~/interface/ui and other vendored packages ship .tsx source. vite pre-bundles only
  // .js/.ts entries by default, so a .tsx entry would load raw and its own imports
  // (tamagui subpaths, CJS react/jsx-runtime) would skip dependency discovery.
  optimizeDeps: {
    extensions: ['.tsx'],
  },

  resolve: {
    dedupe: ['on-zero', '@rocicorp/zero'],
  },

  ssr: {
    external: ['on-zero', '@rocicorp/zero'],
    // auth packages expose React hooks from package code. bundle them through
    // Vite so SSR uses the renderer's React instance.
    noExternal: ['better-auth', '@o/helpers', '~/auth/helpers'],
  },
}
