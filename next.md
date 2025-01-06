1.0:

  - tests
    - goal for 20+ deps covered on native + web (ssr) (see weird-deps for some)
    - native tests that run in `yarn test`

  - etc
    - enable StrictMode
    - headless tabs (no style included)
      - headless everything really
    - react-native-safe-area-context
      - were using Compat version from react-navigation seems to not work directly on web, need to fix/document

  - native
    - better hmr
    - better caching
    - symbolicator
    - restore GestureHandlerRootView
    - Tabs.Screen href shouldn't be necessary (see docs on Tabs / Tabs examples)
    - better rebuild module caching

  - web
    - vercel and cloudflare deploy options working/documented
      - vercel using build output api

  - packages
    - react-scan update and native re-enable

  - build
    - way to configure the api + server config during production builds
    - worker threads, 3x+ build speed with paralellizing

  - cleanup
    - get rid of most patching in favor of plugins that are smart
    - codebase needs a few passes cleaning up things (__vxrn globals, structure)

---

2.0:

  - react 19
  - use dom with RSC bridge
  - native tabs and sheet
  - react-native-web-lite proper release

---

# backlog

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

- TODO this would probably want to support their configured extensions

- useLoader new useEffect to fetch new loader loader data
  - hits /_vxrn/load/pathname.js for ssg at least
  - in dev mode handleRequest just runs handleLoader
  - in build mode generates the json
