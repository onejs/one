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
            // maps builds set GOOGLE_MAPS_API_KEY at prebuild time (a
            // placeholder compiles the maps source set in; tiles stay blank
            // without a restricted key). unset keeps the nomaps flavor.
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
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
