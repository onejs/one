// import registerRootComponent from 'expo/src/launch/registerRootComponent';
// console.log(`registerRootComponent is ${registerRootComponent}`)
// import App from './App';
// registerRootComponent(App);

console.warn('hello start to run create app')

import * as l1 from './app/_layout';
import * as i1 from './app/index';

import { createApp } from 'one'
// import '@expo/metro-runtime';
export default createApp({
  // routes: import.meta.glob(
  //   [
  //     '/Users/z/Projects/vxrn/examples/expo-blank-with-vite-metro/app/**/*.tsx',
  //     '!/Users/z/Projects/vxrn/examples/expo-blank-with-vite-metro/app/**/*+api.tsx',
  //   ],
  //   { exhaustive: true }
  // ),
  // routes: {
  //   './app/_layout.tsx': () =>
  //     import('./app/_layout.tsx'),
  //   './app/index.tsx': () =>
  //     import('./app/_layout.tsx'),
  // },

  routes: {
    '/app/_layout.tsx': async () =>
      l1,
    '/app/index.tsx': async () =>
      i1,
  },

  // routes: 'asdf',

  routerRoot: 'app',
  flags: {},
})

console.warn('hello run create app end')
