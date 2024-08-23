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
      'index.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-19');`,
      },
      'jsx-dev-runtime.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-jsx-dev-19');`,
      },
      'jsx-runtime.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-jsx-19');`,
      },
      'package.json': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'index.web.js')

        const pkg = JSON.parse(contents)

        if (!pkg.exports['.']) {
          throw new Error(`Expected a version of React that has package.json exports defined`)
        }

        pkg.exports['.'] = {
          'react-server': './react.shared-subset.js',
          'react-native': './index.js',
          default: './index.web.js',
        }

        pkg.exports['./jsx-runtime'] = {
          'react-native': './jsx-runtime.js',
          default: './jsx-runtime.web.js',
        }

        pkg.exports['./jsx-dev-runtime'] = {
          'react-native': './jsx-dev-runtime.js',
          default: './jsx-dev-runtime.web.js',
        }

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  {
    module: 'react-dom',
    patchFiles: {
      'client.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-dom-client-19')`,
      },

      'index.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-dom-19')`,
      },

      'server.browser.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-dom-server.browser-19')`,
      },

      'test-utils.web.js': {
        add: `module.exports = require('@vxrn/vendor/react-dom-test-utils-19')`,
      },

      'package.json': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'index.web.js')

        const pkg = JSON.parse(contents)

        if (!pkg.exports['.']) {
          throw new Error(`Expected a version of React that has package.json exports defined`)
        }

        pkg.exports['.'] = {
          'react-native': './index.js',
          default: './index.web.js',
        }

        pkg.exports['./client'] = {
          'react-native': './client.js',
          default: './client.web.js',
        }

        pkg.exports['./server.browser'] = {
          'react-native': './server.browser.js',
          default: './server.browser.web.js',
        }

        pkg.exports['./test-utils'] = {
          'react-native': './test-utils.js',
          default: './test-utils.web.js',
        }

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  {
    module: '@react-native-masked-view/masked-view',
    patchFiles: {
      '*.js': ['flow'],
    },
  },

  {
    module: 'react-native-webview',
    patchFiles: {
      '*.js': ['swc'],
    },
  },
]
