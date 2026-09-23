import { defineConfig, type Plugin } from 'vite'
import { one } from 'one/vite'

// the gpu fixture's three.js path: bare 'three' resolves to the webgpu
// build and @react-three/fiber to its web entry on the native
// environments only, so web keeps WebGL three. vite has no per-environment
// resolve.alias, so this is a resolveId plugin scoped by environment name.
// exact matches only: a prefix rewrite would also catch 'three/webgpu' and
// 'three/tsl', which already resolve through three's exports map.
function nativeWebgpuAliases(): Plugin {
  return {
    name: 'native-webgpu-aliases',
    applyToEnvironment: (environment) =>
      environment.name === 'ios' || environment.name === 'android',
    async resolveId(source, _importer, options) {
      if (source === 'three' || source === '@react-three/fiber') {
        const target =
          source === 'three'
            ? 'three/webgpu'
            : '@react-three/fiber/dist/react-three-fiber.esm.js'
        return await this.resolve(target, undefined, {
          ...options,
          skipSelf: true,
        })
      }
      return null
    },
  }
}

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
    nativeWebgpuAliases(),
  ],
})
