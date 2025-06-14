import { assertString } from '../utils/assert'
import { type DepPatch, bailIfUnchanged } from '../utils/patches'

export const builtInDepPatches: DepPatch[] = [
  {
    module: 'react',
    patchFiles: {
      version: '18.*',

      'compiler-runtime.js': `module.exports = require('@vxrn/vendor/react-19-compiler-runtime');`,
      'index.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-19');`,
      'jsx-dev-runtime.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-jsx-dev-19');`,
      'jsx-runtime.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-jsx-19');`,

      'package.json': (contents) => {
        assertString(contents)

        const pkg = JSON.parse(contents)

        if (pkg.version.startsWith('19.')) {
          // already on 19 no need to patch!
          return
        }

        const existingExports = { ...pkg.exports }

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

        pkg.exports['./compiler-runtime'] = {
          default: './compiler-runtime.js',
        }

        pkg.exports['./jsx-dev-runtime'] = {
          'vxrn-web': './jsx-dev-runtime.vxrn-web.js',
          default: './jsx-dev-runtime.js',
        }

        bailIfUnchanged(existingExports, pkg.exports)

        return JSON.stringify(pkg, null, 2)
      },

      // for prod builds we have to actually change the entries:

      // to avoid terrible metro we have to eval :(
      'index.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-19')")) } else {
  ${contents}
}`
      },

      // to avoid terrible metro we have to eval :(
      'jsx-runtime.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-jsx-19')")) } else {
  ${contents}
}`
      },
    },
  },

  {
    module: 'react-dom',
    patchFiles: {
      version: '18.*',

      // for prod builds we have to actually change the entries:
      'index.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-dom-19')")) } else {
${contents}
}`
      },

      'client.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, eval("require('@vxrn/vendor/react-dom-client-19')")) } else {
${contents}
}`
      },

      'server.browser.js': (contents) => {
        assertString(contents)
        return `
if (process.env.VXRN_REACT_19) { Object.assign(exports, require('@vxrn/vendor/react-dom-server.browser-19')) } else {
${contents}
}`
      },

      'client.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-client-19')`,

      'index.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-19')`,

      'server.browser.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-server.browser-19')`,

      'test-utils.vxrn-web.js': `module.exports = require('@vxrn/vendor/react-dom-test-utils-19')`,

      'package.json': (contents) => {
        assertString(contents)

        const pkg = JSON.parse(contents)

        if (pkg.version.startsWith('19.')) {
          // already on 19 no need to patch!
          return
        }

        const existingExports = { ...pkg.exports }

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

        bailIfUnchanged(existingExports, pkg.exports)

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  // Older versions of the cli-config package will not look for `.cjs` files when loading the config. This isn't necessary for v14.x (which comes with RN 0.75). See: https://hackmd.io/@z/SJghMPN6C.
  {
    module: '@react-native-community/cli-config',
    patchFiles: {
      version: '^13',
      'build/readConfigFromDisk.js': (contents) => {
        assertString(contents)

        return contents
          .replace(
            `['react-native.config.js']`,
            `['react-native.config.js', 'react-native.config.cjs']`
          )
          .replace(
            'searchPlaces,',
            `searchPlaces, loaders: { '.cjs': _cosmiconfig().default.loadJs },`
          )
          .replace(
            'stopDir: rootFolder,',
            `stopDir: rootFolder, loaders: { '.cjs': _cosmiconfig().default.loadJs },`
          )
      },
    },
  },

  {
    module: 'react-native-reanimated',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: '@react-native-masked-view/masked-view',
    patchFiles: {
      '**/*.js': ['flow', 'swc'],
    },
  },

  {
    module: 'react-native-vector-icons',
    patchFiles: {
      '**/*.js': ['jsx', 'flow'],
    },
  },

  {
    module: 'react-native-webview',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: '@react-native/assets-registry',
    patchFiles: {
      '**/*.js': ['flow'],
    },
  },

  {
    module: 'expo',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo',
    patchFiles: {
      version: '52.*',
      'src/winter/runtime.native.ts': (contents) => {
        assertString(contents)

        return contents.replace(
          `
// https://encoding.spec.whatwg.org/#textdecoder
install('TextDecoder', () => require('./TextDecoder').TextDecoder);
// https://url.spec.whatwg.org/#url
install('URL', () => require('./url').URL);
// https://url.spec.whatwg.org/#urlsearchparams
install('URLSearchParams', () => require('./url').URLSearchParams);
            `.trim(),
          `
import { TextDecoder } from './TextDecoder';
import { URL } from './url';
import { URLSearchParams } from './url';

// https://encoding.spec.whatwg.org/#textdecoder
install('TextDecoder', () => TextDecoder);
// https://url.spec.whatwg.org/#url
install('URL', () => URL);
// https://url.spec.whatwg.org/#urlsearchparams
install('URLSearchParams', () => URLSearchParams);
            `.trim()
        )
      },
    },
  },

  {
    module: 'expo-modules-core',
    patchFiles: {
      version: '2.*',
      'src/ts-declarations/global.ts': (contents) => {
        assertString(contents)

        // Make it compatible with other packages that also overrides ProcessEnv, such as `bun-types`.
        // Prevents type-checking errors like "Named property 'NODE_ENV' of types 'ExpoProcessEnv' and 'Env' are not identical."
        return contents.replace('NODE_ENV: string;', 'NODE_ENV?: string;')
      },

      // lets us use tsconfig verbatimModuleSyntax in peace
      'src/uuid/uuid.ts': (contents) => {
        return contents?.replace(
          `import { UUID, Uuidv5Namespace } from './uuid.types`,
          `import { type UUID, Uuidv5Namespace } from './uuid.types`
        )
      },
    },
  },

  {
    module: 'expo-image',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-linear-gradient',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'react-native-css-interop',
    patchFiles: {
      'dist/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-video',
    patchFiles: {
      'build/index.js': (contents) => {
        // bad type export that can't be auto-fixed
        return contents?.replace(`export { VideoThumbnail } from './VideoThumbnail';`, ``)
      },
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'react-native-css-interop',
    patchFiles: {
      'dist/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-video',
    patchFiles: {
      'build/index.js': (contents) => {
        // bad type export that can't be auto-fixed
        return contents?.replace(`export { VideoThumbnail } from './VideoThumbnail';`, ``)
      },
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: 'expo-clipboard',
    patchFiles: {
      'build/**/*.js': ['jsx'],
    },
  },

  {
    module: '@expo/vector-icons',
    patchFiles: {
      'build/**/*.js': ['jsx'],
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

  {
    module: 'qrcode',
    patchFiles: {
      version: '<=1.5.1',

      'lib/server.js': (contents) => {
        assertString(contents)
        return contents.replace(
          `const TerminalRenderer = require('./renderer/terminal')`,
          `const TerminalRenderer = require('./renderer/terminal.js')`
        )
      },
    },
  },

  {
    module: 'expo-camera',
    patchFiles: {
      version: '<=16.0.0',
      '**/*.js': ['jsx'],
    },
  },
  {
    module: 'expo-blur',
    patchFiles: {
      '**/*.js': ['jsx'],
    },
  },

  {
    module: 'whatwg-url-without-unicode',
    // https://github.com/onejs/one/issues/258
    patchFiles: {
      '**/*.js': (contents) =>
        contents
          ?.replace(/punycode\.ucs2\.decode/gm, '(punycode.ucs2decode || punycode.ucs2.decode)')
          ?.replace(/punycode\.ucs2\.encode/gm, '(punycode.ucs2encode || punycode.ucs2.encode)'),
    },
  },

  {
    module: 'html-entities',
    patchFiles: {
      version: '2.*',
      // [react-native-live-markdown] `parseExpensiMark` requires `html-entities` package to be workletized.
      'lib/index.js': (contents) => {
        assertString(contents)
        if (contents.startsWith(`'worklet';`)) return contents

        return `'worklet';\n\n${contents}`
      },
    },
  },
]
