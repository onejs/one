1.0:

  - SPA only mode
    - you can set build.server: false but it breaks `build static routes` with "No server output", ideally we can make this still work so you can have SPA + some SSG if you need, you could detect if all routes are SPA up front and skip it, and then if there are some static or ssr you'd build server
  - // TODO: temp until we fix sourcemap issues!
  - aliases for react-native/ on web:
    - https://discord.com/channels/1223009626400751671/1334176876347789333/1334179606139506803
  - we hit network for loaders even if they don't exist, need to ship info about loaders existing to clients to avoid those requests
  - expose useRouteInfo or similar (do things like change layout for not-found pages)
  - if you remove escape-string-regexp from `dedupe` breaks
    - non-deduped modules that live in diff sub-dirs resolve to the same id: ___modules___["escape-string-regexp/index.js"]
  - root layout doesnt HMR
  - hmr native tamagui example gives:
    Error: [vite] cannot find entry point module 'virtual:one-entry'.
  - react-native-safe-area-context
    - were using Compat version from react-navigation seems to not work directly on web, need to fix/document
  - restore GestureHandlerRootView
  - enable StrictMode
  - lower priority useLoader(loader, { suspense: false, disable: true })

  - fix _preloads.js for dynamic segments

  - tests
    - native tests that run in `yarn test`
    - fix loader search params refetch tests (currently skipped):
      - `loader refetches when search params change` - needs automatic refetch on search param changes
      - `SPA mode: loader refetches on search params and manual refetch` - SPA mode search param handling
      - `SSR mode: loader refetches on search params and manual refetch` - SSR mode search param handling
      - `loader refetches on pathname change and manual refetch` - pathname change refetch issues
    - browser goForward navigation issue (goBack works, goForward doesn't update UI):
      - Test skipped in `tests/test-routing-flicker/tests/ssg-flicker.test.ts`
      - URL changes but UI stays on current content when using browser forward button
      - Root cause: `useLinking.ts` forward/back decision logic at lines 286-319 uses `index > previousIndex`
      - The `index` getter in `createMemoryHistory.tsx` looks up `window.history.state?.id` in `items` array
      - May return stale value or `previousIndexRef` doesn't update correctly during forward navigation
      - Expo has similar fix in PR #33524 (Dec 2024) but already applied to our code
      - See `docs/SSG_HYDRATION_FIX.md` for detailed investigation notes

  - native
    - hmr tests + multi-file
    - caching
    - symbolicator
    - Tabs.Screen href shouldn't be necessary (see docs on Tabs / Tabs examples)
    - better rebuild module caching

  - web
    - test app basic ssr needs fixing
      - ssr loaders need to build to server dir instead of client
    - vercel and cloudflare deploy options working/documented
      - vercel using build output api

  - build
    - lets make a simple option to use vite-plugin-commonjs
      - commonjs: (id) => boolean
    - way to configure the api + server config during production builds

  - cleanup
    - react-native-template.js needs a big cleanup
      - eg remove ___vxrnAbsoluteToRelative___[absPath.replace(/\.js$/, '.tsx')]
    - codebase needs a few passes cleaning up things (__vxrn globals, structure)
    - error logs on build:web `../../node_modules/expo-modules-core/src/NativeModule.ts (1:0): Error when using sourcemap for reporting an error: Can't resolve original location of error.`

---

- ownerstack for nicer errors
  - https://github.com/facebook/react/releases/tag/v19.1.0

- if there's no not-found route at the root, middleware wont run in prod
  - can fix this, but also we could first document that you need not-found for middleware to run if routes arent found until fixed

  - it seems we render root layout then find screens, then re-render again and that could be done much better, probabyl we should use the new react navigation static definition method to define everything up-front rather than during render. should be faster and simpler.
  - unify the node module finding in dep patches + auto optimize
  - `doctor --fix`
    - ensure type: 'module' in package.json
    - ensure vite.config
    - ensure tsconfig "module": "Preserve", "moduleResolution": "Bundler", (or else import 'one/vite' can break using node)
  - headless tabs (no style included), headless everything really
  - allow customizing react navigation Theme
  - can configure how loaders run not tied to render mode (on build or request)
  - layouts can be ssg, while pages can be spa
  - get rid of most patching in favor of plugins that are smart
  - worker threads, 3x+ build speed with paralellizing
  - react-scan update and native re-enable
  - router.redirect directly in layout (server-side)
    - for auth-guard (see tests/test/auth-guard)
    - requires server-side integration logic
  - use dom with RSC bridge
  - react-native-web-lite proper release

- allow configuring swc from one

- // TODO see about moving to hotUpdate
    // https://deploy-preview-16089--vite-docs-main.netlify.app/guide/api-vite-environment.html#the-hotupdate-hook

- fix `sub middleware intercepts` test
  - fix TODO intercept not working

- proper babel config option:
  - allow config option on one plugin like: `transformWithBabel(id, code): string[] | babelConfig | boolean` where string[] can be a list of plugins to use for that specific file

- nuqs-like type safe search

- prebuild react native shouldn't have hardcoded exports list

- style tag to CSS, we could have a mode that takes style tags with precedense/key set and have a mode to optimize that to css

- perf - in dev mode collectStyle is called a ton on each load

- Sitemap

- shouldnt export ErrorBoundary, but should make current RootErrorBoundary much better, rename it to ErrorBoundary, then export that

- `Error building React Native bundle: Error ... EISDIR: illegal operation on a directory, read`
  - Happens with react-native-svg 15.6.0 where it has `elements.js` and `elements` directory at the same time
  - happens on `qrcode@1.5.1`
    - qrcode/lib/renderer/terminal (imported by qrcode/lib/server.js
  - Might be related to bug [40E4] in the VXRN Takeout Issue List

- uniswap repo has to use commonjs plugin but its very tricky to configure
  - ideally we get a lot better at automating this, documenting, and maybe make it just a configuration key in one plugin

- turn this back off VXRN_ENABLE_SOURCE_MAP:
  - https://github.com/swc-project/swc/issues/9416

  - bring back some form of useMetroSymbolication
- safe-area-context should be configurable to leave it out entirely if you want

- one should have more than just patches, but also config that is set per-node_module
  - eg, react 19 sets: 'process.env.TAMAGUI_REACT_19': '"1"'
  - another cool idea: node_modules package.json sets "vite" field that can add these custom configs, so `tamagui` package can define that *for* react 19

- an easy way to disable swc transform for a node_module using `deps`

- useLoader new useEffect to fetch new loader loader data
  - hits /_vxrn/load/pathname.js for ssg at least
  - in dev mode handleRequest just runs handleLoader
  - in build mode generates the json

- route sorting algorithm isn't same between server (packages/one/src/router/sortRoutes.ts) and client (getRouteConfigSorter in packages/one/src/fork/getStateFromPath-mods.ts), may lead to loader bug on edge cases
- missing root `_layout.tsx` will lead to unclear error
- better error handling for API route functions returning incorrect data types (e.g. a string)
