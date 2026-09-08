import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { UserConfig } from 'vite'
import { webExtensions } from '../constants'

// TODO we need to traverse to get sub-deps...

export function getOptimizeDeps(mode: 'build' | 'serve', root = process.cwd()) {
  // callers hand us a vite/vxrn root that may be relative, and the node_modules walk needs
  // an absolute path or it stops at the cwd instead of continuing to the filesystem root
  const rootDir = resolve(root)
  const packageJsonCache = new Map<string, PackageManifest | null>()
  const isIncludable = (dep: string) => subpathIsDeclared(dep, rootDir, packageJsonCache)

  const needsInterop = [
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
  ].filter(isIncludable)

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
    'react-native',
    '@floating-ui/react',
    '@floating-ui/react-dom',
    'tamagui',
    'reforest',
  ].filter(isIncludable)

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
        '@expo/log-box',
        'qrcode-terminal',
        '@hot-updater/cli-tools',
      ],
      needsInterop,
      // Enable lazy optimization - don't wait for all deps before starting server
      // This allows browser to process requests in parallel for faster initial load
      holdUntilCrawlEnd: false,
      rolldownOptions: {
        resolve: {
          extensions: webExtensions,
        },
        // some packages ship JSX in .js files (e.g., react-native-css-interop/dist/doctor.js).
        // .ts/.tsx must be declared too. when es-module-lexer can't read a dep entry,
        // vite's extractExportsData retries it as `moduleTypes[extname] || 'jsx'`, and
        // lexer always fails on TS syntax — so an undeclared .ts entry gets re-parsed as
        // JSX and dies on the first inline type specifier (`import { type Foo }`), which
        // is how expo 57 packages are written.
        moduleTypes: { '.js': 'jsx', '.ts': 'ts', '.tsx': 'tsx' },
        // react-native packages import native-only exports (TurboModuleRegistry etc.)
        // from react-native, which is aliased to react-native-web on web. react-native-web
        // doesn't export these, so rolldown would error. shimMissingExports creates
        // undefined shims instead, matching esbuild's lenient behavior.
        shimMissingExports: true,
      },
    } satisfies UserConfig['optimizeDeps'],
  }
}

type PackageManifest = { exports?: unknown }

/**
 * vite resolves every `optimizeDeps.include` entry eagerly. an entry whose package is
 * installed but no longer declares that subpath in `exports` is a hard resolve error, not a
 * warning, so listing one kills dev server startup. nativewind v5 dropping ./jsx-runtime and
 * ./jsx-dev-runtime is the case that hit us; guard the whole list so the next drop is a no-op.
 */
function subpathIsDeclared(
  dep: string,
  root: string,
  cache: Map<string, PackageManifest | null>
): boolean {
  const packageName = getPackageName(dep)
  if (dep === packageName) {
    // bare package entry, there is no subpath to check
    return true
  }
  const packageJson = readInstalledPackageJson(packageName, root, cache)
  // not installed at all is only a vite warning, and a package with no `exports` map still
  // resolves subpaths off the filesystem. neither case is ours to drop.
  if (!packageJson?.exports) {
    return true
  }
  return exportsDeclaresSubpath(packageJson.exports, `.${dep.slice(packageName.length)}`)
}

function getPackageName(dep: string): string {
  const parts = dep.split('/')
  return dep[0] === '@' ? parts.slice(0, 2).join('/') : parts[0]
}

function readInstalledPackageJson(
  packageName: string,
  root: string,
  cache: Map<string, PackageManifest | null>
): PackageManifest | null {
  const cached = cache.get(packageName)
  if (cached !== undefined) {
    return cached
  }

  let found: PackageManifest | null = null
  let dir = root
  while (true) {
    const file = join(dir, 'node_modules', packageName, 'package.json')
    if (existsSync(file)) {
      try {
        found = JSON.parse(readFileSync(file, 'utf-8'))
      } catch {
        // unreadable manifest, treat it as unknown and keep the entry
      }
      break
    }
    const parent = dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  cache.set(packageName, found)
  return found
}

function exportsDeclaresSubpath(exports: unknown, subpath: string): boolean {
  if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
    // a string or array `exports` declares the root entry only
    return false
  }
  // a `null` target is an explicit "not exported", so key presence alone proves nothing, and
  // keys not starting with `.` are a conditions-only map, again the root entry only. this is
  // the same walk vite does in `expandGlobIds`.
  return Object.entries(exports as Record<string, unknown>).some(
    ([key, target]) => target != null && key[0] === '.' && exportKeyMatches(key, subpath)
  )
}

function exportKeyMatches(key: string, subpath: string): boolean {
  const star = key.indexOf('*')
  if (star === -1) {
    return key === subpath
  }
  // only the first `*` is a wildcard per the node exports spec
  const prefix = key.slice(0, star)
  const suffix = key.slice(star + 1)
  return (
    subpath.length >= prefix.length + suffix.length &&
    subpath.startsWith(prefix) &&
    subpath.endsWith(suffix)
  )
}
