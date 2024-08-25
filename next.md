- dep issues

  -  ../../node_modules/@sentry/react-native/dist/js/utils/environment.js (1:9): "version" is not exported by "virtual:rn-internals:react-native/Libraries/Core/ReactNativeVersion", imported by "../../node_modules/@sentry/react-native/dist/js/utils/environment.js".


- turn this back off VXRN_ENABLE_SOURCE_MAP:
  - https://github.com/swc-project/swc/issues/9416

- for some reason rollup newer versions have syntax error on trying to load native bundle on basic starter

- 
