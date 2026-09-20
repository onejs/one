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
          ios: {
            bundleId: 'dev.onestack.demo.social',
            deploymentTarget: '26.0',
            screensGamma: true,
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
