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
          // non-default versions the app-info conformance suites assert
          // exactly, proving prebuild stamping reaches runtime.
          version: '9.9.9',
          imagePicker: {
            camera: 'NativeFeatureTests verifies photo capture.',
          },
          ios: {
            bundleId: 'dev.vxrn.native.tests',
            buildNumber: '4242',
            deploymentTarget: '17.0',
            fileSharing: true,
          },
          android: {
            applicationId: 'dev.vxrn.nativefeatures.tests',
            versionCode: 4242,
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
