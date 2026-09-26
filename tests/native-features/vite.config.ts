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

// endpoints the fetch fixture drives on the dev server the app already
// talks to: a body streamed in timed chunks, an echo of what arrived, a
// redirect, a cookie round trip, and a response that never finishes.
function fetchConformanceEndpoints(): Plugin {
  const prefix = '/__one-native-fetch/'
  return {
    name: 'one-native-fetch-endpoints',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(prefix)) return next()
        const route = req.url.slice(prefix.length).split('?')[0]
        if (route === 'stream') {
          res.writeHead(200, { 'content-type': 'application/x-ndjson' })
          const lines = ['{"n":1}\n', '{"n":2}\n', '{"n":3}\n']
          const send = (index: number) => {
            if (index === lines.length) return res.end()
            res.write(lines[index])
            setTimeout(() => send(index + 1), 600)
          }
          send(0)
          return
        }
        if (route === 'bytes') {
          res.writeHead(200, { 'content-type': 'application/octet-stream' })
          res.end(Buffer.from([0, 1, 2, 255]))
          return
        }
        if (route === 'redirect') {
          res.writeHead(302, { location: `${prefix}echo` })
          res.end()
          return
        }
        if (route === 'set-cookie') {
          res.writeHead(204, { 'set-cookie': 'one_fetch=1; Path=/' })
          res.end()
          return
        }
        if (route === 'no-content') {
          res.writeHead(204)
          res.end()
          return
        }
        if (route === 'hang') {
          // an event stream: text/plain would sit in URLSession's 512-byte
          // content sniffing buffer before its first chunk surfaces
          res.writeHead(200, { 'content-type': 'text/event-stream' })
          res.write('first')
          req.on('close', () => res.end())
          return
        }
        if (route === 'echo') {
          const chunks: Buffer[] = []
          req.on('data', (chunk: Buffer) => chunks.push(chunk))
          req.on('end', () => {
            const body = Buffer.concat(chunks)
            res.writeHead(200, { 'content-type': 'application/json', 'x-one-echo': 'yes' })
            res.end(
              JSON.stringify({
                method: req.method,
                contentType: req.headers['content-type'] ?? null,
                custom: req.headers['x-one-test'] ?? null,
                cookie: req.headers.cookie ?? null,
                // a body of known length arrives with content-length, not chunked
                length: req.headers['content-length'] ?? null,
                hex: body.toString('hex'),
                text: body.toString('latin1'),
              })
            )
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    one({
      native: {
        app: {
          name: 'NativeFeatureTests',
          scheme: 'nativefeatures',
          notifications: {},
          pictureInPicture: true,
          // non-default versions the app-info conformance suites assert
          // exactly, proving prebuild stamping reaches runtime.
          version: '9.9.9',
          imagePicker: {
            camera: 'NativeFeatureTests verifies photo capture.',
          },
          speech: {
            recognition: 'NativeFeatureTests verifies dictation.',
            microphone: 'NativeFeatureTests verifies dictation.',
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
            // react-native-webgpu calls AHardwareBuffer, which is api 26+.
            minSdk: 26,
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
    fetchConformanceEndpoints(),
  ],
})
