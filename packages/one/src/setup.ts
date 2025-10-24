// leaving this as an example of afterClientRender
// import { afterClientRender } from './render'

// if (process.env.ONE_ENABLE_REACT_SCAN) {
//   // @ts-ignore (react-scan can be undefined or not depending on if the monorepo uses it)
//   import('react-scan').then(({ scan }) => {
//     afterClientRender(() => {
//       scan(JSON.parse(`${process.env.ONE_ENABLE_REACT_SCAN}`))
//     })
//   })
// }

// fixes bad import error in expo-modules-core
// without this you run into error loading web immediately
// where globalThis.expo is not defined
// @zetavg: the actual thing we need to do is maybe import and call `installExpoGlobalPolyfill`. This is currently the file that does it, so we import it.
// import 'expo-modules-core/src/polyfill/index.web.ts'
