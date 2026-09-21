// leaving this as an example of afterClientRender
// import { afterClientRender } from './render'

// if (process.env.ONE_ENABLE_REACT_SCAN) {
//   // @ts-expect-error (react-scan can be undefined or not depending on if the monorepo uses it)
//   import('react-scan').then(({ scan }) => {
//     afterClientRender(() => {
//       scan(JSON.parse(`${process.env.ONE_ENABLE_REACT_SCAN}`))
//     })
//   })
// }
