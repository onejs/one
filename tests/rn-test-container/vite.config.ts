import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      native: {
        app: {
          name: 'RNTestContainer',
          scheme: 'nativefeatures',
          ios: {
            bundleId: 'dev.onestack.rntestcontainer',
            deploymentTarget: '26.0',
          },
          android: {
            applicationId: 'dev.onestack.rntestcontainer',
          },
        },
      },
    }),
  ],
})
