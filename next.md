- dep issues

  -  ../../node_modules/@sentry/react-native/dist/js/utils/environment.js (1:9): "version" is not exported by "virtual:rn-internals:react-native/Libraries/Core/ReactNativeVersion", imported by "../../node_modules/@sentry/react-native/dist/js/utils/environment.js".


- turn this back off VXRN_ENABLE_SOURCE_MAP:
  - https://github.com/swc-project/swc/issues/9416

- for some reason rollup newer versions have syntax error on trying to load native bundle on basic starter

- RootErrorBoundary and errors in general need love
  - bring back some form of useMetroSymbolication
- safe-area-context should be configurable to leave it out entirely if you want

- vxs should have more than just patches, but also config that is set per-node_module
  - eg, react 19 sets: 'process.env.TAMAGUI_REACT_19': '"1"'
  - another cool idea: node_modules package.json sets "vite" field that can add these custom configs, so `tamagui` package can define that *for* react 19
