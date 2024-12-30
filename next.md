1.0 ordered from most work to least:

  - react-native-safe-area-context
    - were using Compat version from react-navigation seems to not work directly on web, need to fix/document

  - native
    - Tabs.Screen href shouldn't be necessary (see docs on Tabs / Tabs examples)
    - large test suite + supports 1000 most popular dependencies
    - better hmr
    - better rebuild module caching
    - symbolicator

  - web
    - vercel and cloudflare deploy options working/documented
      - vercel using build output api
    - faster route matching, regex routers can be faster than trie
      - see handleRequest file, npm radix3 or rou3

---

# backlog

- react-native-web-lite proper release

- need a way ton configure the api + server etc during production builds

- style tag to CSS, we could have a mode that takes style tags with precedense/key set and have a mode to optimize that to css

- perf - in dev mode collectStyle is called a ton on each load

- probably need to bundle api routes by default? too many esm/cjs issues

- Sitemap is partially done

- shouldnt export ErrorBoundary, but should make current RootErrorBoundary much better, rename it to ErrorBoundary, then export that

- `Error building React Native bundle: Error ... EISDIR: illegal operation on a directory, read`
  - Happens with react-native-svg 15.6.0 where it has `elements.js` and `elements` directory at the same time
  - happens on `qrcode@1.5.1`
    - qrcode/lib/renderer/terminal (imported by qrcode/lib/server.js
  - Might be related to bug [40E4] in the VXRN Takeout Issue List

- uniswap repo has to use commonjs plugin but its very tricky to configure
  - ideally we get a lot better at automating this, documenting, and maybe make it just a configuration key in one plugin

- use dom

- prebuild react native shouldn't have hardcoded exports list

- add test to weird-deps so we know no regressions

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

- Better SWC config in vite-native-swc to fit Hermes better. Maybe we can see what's included in [`@react-native/babel-preset`](https://github.com/facebook/react-native/tree/main/packages/react-native-babel-preset) and try to match that.

post launch projects:

- turning the entire one/tamagui.dev splash + blog into either a template or "engine"
