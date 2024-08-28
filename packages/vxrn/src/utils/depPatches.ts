import { assertString } from './assert'
import { type DepPatch, bailIfExists } from './patches'

// TODO has no concept of version range checking, or patch versions

export const depPatches: DepPatch[] = [
  {
    module: 'h3',
    patchFiles: {
      'dist/index.mjs': (contents) => {
        assertString(contents)
        bailIfExists(contents, '/** patch-version-1 **/')
        return contents.replace(
          `function getProxyRequestHeaders(event) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name)) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}`,
          `function getProxyRequestHeaders(event) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name)) {
      headers[name] = reqHeaders[name];
    }
  }

  // The expoManifestRequestHandlerPlugin (Vite plugin) needs the original request host so that it can compose URLs that can be accessed by physical devices. This won't be needed once we retire h3 and use the Vite Dev Server directly.
  // This may not work if one installed vxrn from NPM since this patch may not apply.
  const originalHost = reqHeaders.host;
  if (originalHost) {
    headers['X-Forwarded-Host'] = originalHost;
  }

  return headers;
}`
        )
      },
    },
  },

  {
    module: 'react',
    patchFiles: {
      version: '18.*',

      'index.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-19');`,
      'jsx-dev-runtime.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-jsx-dev-19');`,
      'jsx-runtime.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-jsx-19');`,

      'package.json': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'index.vxrn-web.js')

        const pkg = JSON.parse(contents)

        if (pkg.version.startsWith('19.')) {
          // already on 19 no need to patch!
          return
        }

        if (!pkg.exports['.']) {
          throw new Error(`Expected a version of React that has package.json exports defined`)
        }

        pkg.exports['.'] = {
          'react-server': './react.shared-subset.js',
          'vxrn-web': './index.vxrn-web.js',
          default: './index.js',
        }

        pkg.exports['./jsx-runtime'] = {
          'vxrn-web': './jsx-runtime.vxrn-web.js',
          default: './jsx-runtime.js',
        }

        pkg.exports['./jsx-dev-runtime'] = {
          'vxrn-web': './jsx-dev-runtime.vxrn-web.js',
          default: './jsx-dev-runtime.js',
        }

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  {
    module: 'react-dom',
    patchFiles: {
      version: '18.*',

      'client.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-client-19')`,

      'index.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-19')`,

      'server.browser.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-server.browser-19')`,

      'test-utils.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-test-utils-19')`,

      'package.json': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'index.vxrn-web.js')

        const pkg = JSON.parse(contents)

        if (pkg.version.startsWith('19.')) {
          // already on 19 no need to patch!
          return
        }

        if (!pkg.exports['.']) {
          throw new Error(`Expected a version of React that has package.json exports defined`)
        }

        pkg.exports['.'] = {
          'vxrn-web': './index.vxrn-web.js',
          default: './index.js',
        }

        pkg.exports['./client'] = {
          'vxrn-web': './client.vxrn-web.js',
          default: './client.js',
        }

        pkg.exports['./server.browser'] = {
          'vxrn-web': './server.browser.vxrn-web.js',
          default: './server.browser.js',
        }

        pkg.exports['./test-utils'] = {
          'vxrn-web': './test-utils.vxrn-web.js',
          default: './test-utils.js',
        }

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  {
    module: '@react-native-masked-view/masked-view',
    patchFiles: {
      '**/*.js': ['flow', 'swc'],
    },
  },

  {
    module: 'react-native-webview',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: 'rollup',
    patchFiles: {
      'dist/es/shared/node-entry.js': (contents) => {
        assertString(contents)
        // fixes problem with @sentry/react-native 5.5.0 using setimmediate polyfill causing error
        return contents.replace(
          `return this.exportNamesByVariable.get(variable)[0];`,
          `return this.exportNamesByVariable.get(variable)?.[0];`
        )
      },
    },
  },

  {
    module: '@react-native/assets-registry',
    patchFiles: {
      '**/*.js': ['flow'],
    },
  },

  {
    module: '@sentry/react-native',
    patchFiles: {
      version: '>=5.6.0',
      'dist/**/*.js': ['jsx'],
    },
  },

  {
    module: '@sentry/react-native',
    patchFiles: {
      version: '>=5.0.0 <5.6.0',

      'dist/js/utils/environment.js': (contents) => {
        assertString(contents)
        return contents.replace(
          `import { version as RNV } from 'react-native/Libraries/Core/ReactNativeVersion';`,
          `import { Platform } from 'react-native';\nconst RNV = Platform.constants.reactNativeVersion;\n`
        )
      },

      'dist/**/*.js': ['jsx'],
    },
  },

  // could almost do this? it has a couple errors though
  // {
  //   module: 'react-native',
  //   patchFiles: {
  //     '**/*.js': ['flow'],
  //   },
  // },
]
