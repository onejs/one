import type { UserConfig } from 'vite'
import type { Plugin } from 'esbuild'
import { createRequire } from 'node:module'
import { webExtensions } from '../constants'

// packages that must be singletons (have module-level state)
const singletonPackages = [
  '@tamagui/core',
  '@tamagui/web',
  'tamagui',
  'react',
  'react-dom',
]

// esbuild plugin to force singleton packages to resolve to the same path
// this prevents duplicate module instances when the same package appears
// in different dependency trees during SSR pre-bundling
function createDedupePlugin(root: string): Plugin {
  const require = createRequire(root + '/package.json')
  const resolvedPaths = new Map<string, string>()

  return {
    name: 'vxrn-dedupe-singleton',
    setup(build) {
      // resolve singleton packages to absolute paths
      for (const pkg of singletonPackages) {
        try {
          const resolved = require.resolve(pkg)
          resolvedPaths.set(pkg, resolved)
        } catch {
          // package not installed, skip
        }
      }

      build.onResolve({ filter: /.*/ }, (args) => {
        // check if this is a singleton package
        const resolvedPath = resolvedPaths.get(args.path)
        if (resolvedPath) {
          return { path: resolvedPath }
        }

        // also check for subpaths like @tamagui/core/config
        for (const [pkg, path] of resolvedPaths) {
          if (args.path.startsWith(pkg + '/')) {
            try {
              const subpath = require.resolve(args.path)
              return { path: subpath }
            } catch {
              // subpath doesn't exist
            }
          }
        }

        return null
      })
    },
  }
}

// TODO we need to traverse to get sub-deps...

export function getOptimizeDeps(mode: 'build' | 'serve', root = process.cwd()) {
  const needsInterop = [
    'nativewind/jsx-dev-runtime',
    'nativewind/jsx-runtime',
    'nativewind',

    'react-native-css-interop/jsx-runtime',
    'react-native-css-interop/jsx-dev-runtime',
    'react-native-css-interop',

    'secure-json-parse',

    '@react-native/normalize-colors',
    '@vxrn/safe-area',
    '@vxrn/vendor/react-19-prod',
    '@vxrn/vendor/react-19',
    '@vxrn/vendor/react-19-compiler-runtime',
    '@vxrn/vendor/react-dom-19',
    '@vxrn/vendor/react-dom-client-19',
    '@vxrn/vendor/react-dom-server.browser-19',
    '@vxrn/vendor/react-jsx-19',
    '@vxrn/vendor/react-jsx-dev-19',
    'react',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react/compiler-runtime',
    'react-dom',
    'react-dom/server',
    'react-dom/client',
    'react-native-web-internals',
    'react-native-web',
    '@react-native-masked-view/masked-view',
    'url-parse',
    'query-string',
    'escape-string-regexp',
    'use-latest-callback',
    'react-is',
    'fast-deep-equal',
    '@supabase/auth-helpers-react',
    '@supabase/postgres-js',
    'core-js',
    'parse-numeric-range',
    'use-sync-external-store',
    'use-sync-external-store/shim',
    'expo-constants',
    'expo-linking',
    'inline-style-prefixer',
    '@docsearch/react',
    '@algolia/autocomplete-core',
    '@algolia/autocomplete-plugin-algolia-insights',
    '@algolia/autocomplete-shared',
    'moti',
  ]

  const depsToOptimize = [
    ...needsInterop,

    'fast-xml-parser',
    'set-cookie-parser',
    'ipaddr.js',
    'cross-fetch',
    'pg',
    'react-native-svg',
    'react-native-screens',

    'ws',
    'lodash',
    'moti/author',

    // added these when using a worker env
    'reading-time',
    'mdx-bundler/client',
    'gray-matter',
    'glob',
    'memoize-one',
    'css-in-js-utils',
    'hyphenate-style-name',
    'use-sync-external-store',
    'react-native-reanimated', // uses .web.js extensions
    '@react-navigation/core',
    '@react-navigation/native',
    '@react-navigation/elements',
    '@react-navigation/bottom-tabs',
    '@react-navigation/native-stack',
    'one',
    'styleq',
    'fbjs',
    '@vxrn/universal-color-scheme',
    '@vxrn/color-scheme',
    'requires-port',
    'querystringify',
    'compare-versions',
    'strict-uri-encode',
    'expo-document-picker',
    'decode-uri-component',
    'split-on-first',
    'filter-obj',
    'scheduler',
    'warn-once',
    '@radix-ui/react-compose-refs',
    '@radix-ui/react-slot',
    'expo-splash-screen',
    'nanoid',
    'swr',
    'swr/mutation',
    'one',
    'one/zero',
    'refractor/lang/tsx',
    'invariant',
    'tamagui/linear-gradient',
    '@react-native/normalize-color',
    'expo-modules-core',
    'expo-status-bar',
    'react-native-web',
    'react-native-web-lite',
    'react-native',
    '@floating-ui/react',
    '@floating-ui/react-dom',
    'tamagui',
    'react-native-web',
    'reforest',
  ]

  if (mode === 'build') {
    // breaks in serve mode
    depsToOptimize.push('@babel/runtime')
  }

  return {
    needsInterop,
    depsToOptimize,
    optimizeDeps: {
      include: depsToOptimize,
      exclude: [
        'util',
        '@swc/wasm',
        '@swc/core-darwin-arm64',
        'moti/author',
        // build-time tools that shouldn't be bundled for SSR
        '@tamagui/static',
        '@tamagui/static-worker',
        '@tamagui/vite-plugin',
      ],
      needsInterop,
      // Enable lazy optimization - don't wait for all deps before starting server
      // This allows browser to process requests in parallel for faster initial load
      holdUntilCrawlEnd: false,
      esbuildOptions: {
        resolveExtensions: webExtensions,
        plugins: [createDedupePlugin(root)],
      },
    } satisfies UserConfig['optimizeDeps'],
  }
}
