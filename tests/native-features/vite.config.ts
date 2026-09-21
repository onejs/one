import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      setupFile: {
        native: './setup.native.ts',
      },
      native: {
        app: {
          name: 'NativeFeatureTests',
          scheme: 'nativefeatures',
          notifications: {},
          ios: {
            bundleId: 'dev.vxrn.native.tests',
            deploymentTarget: '17.0',
          },
          android: {
            applicationId: 'dev.vxrn.nativefeatures.tests',
          },
        },
        bundler: process.env.ONE_NATIVE_BUNDLER === 'rolldown' ? 'vite' : 'metro',
      },
      router: {
        linking: {
          scheme: 'nativefeatures',
          prefixes: ['nativefeatures://app'],
        },
      },
    }),
  ],
})
