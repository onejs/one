- dep issues

  -  ../../node_modules/@sentry/react-native/dist/js/utils/environment.js (1:9): "version" is not exported by "virtual:rn-internals:react-native/Libraries/Core/ReactNativeVersion", imported by "../../node_modules/@sentry/react-native/dist/js/utils/environment.js".

- move clientTreeShakePlugin.ts to use:
  - https://github.com/pcattori/babel-dead-code-elimination

- we need to ensure any dep that depends on a optimizedep transitively is optimized as well, eg react, or else you end up with duplications

