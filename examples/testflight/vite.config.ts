import type { UserConfig } from 'vite'
import { one } from 'one/vite'
import { tamaguiPlugin } from '@tamagui/vite-plugin'

export default {
  plugins: [
    one({
      web: {
        deploy: 'vercel',
        defaultRenderMode: 'ssg',
      },

      native: {
        app: {
          name: 'OneSocialDemo',
          displayName: 'One Social Demo',
          icon: {
            source: './assets/app-icon.png',
            backgroundColor: '#000000',
          },
          splash: {
            source: './assets/splash.png',
            backgroundColor: '#000000',
            width: 200,
          },
          ios: {
            bundleId: 'dev.onestack.demo.social',
            tablet: true,
            deploymentTarget: '26.0',
            screensGamma: true,
            useFrameworks: 'static',
            ccache: true,
            usesNonExemptEncryption: false,
          },
          android: {
            applicationId: 'dev.onestack.demo.social',
          },
        },
      },
    }),

    tamaguiPlugin({
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      outputCSS: './code/styles/tamagui.css',
    }),
  ],
} satisfies UserConfig
