- dep issues

for all of these we can also add better fixDependencies options:

`'flow' | 'jsx'`

    - `@react-native-masked-view/masked-view` ships flow in .js file for native
      - auto-detect @flow annotation and transform?

    - `react-native-webview/lib/WebView.js` is jsx

- move clientTreeShakePlugin.ts to use:
  - https://github.com/pcattori/babel-dead-code-elimination

- we need to ensure any dep that depends on a optimizedep transitively is optimized as well, eg react, or else you end up with duplications

