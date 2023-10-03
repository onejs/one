# Get Started

::: warning
Please note, Vern is in early alpha. We need contributions!
:::

Vern is a package that lets you serve your React Native apps using Vite. This is pretty cool as Vite typically doesn't seem like it would "play well" with React Native  - React Native only supports CommonJS, even for hot reloading, whereas Vite is all-in on ESModules.

Luckily, with some effort, we've put together a variety of plugins and configuration for Vite that make this work. We run a full `build` of your app on first request using Vite's internal Rollup, and make some modifications to the CJS it exports so that its well-suited for hot reloading as React Native expects.

Today it runs many simple apps well. We'd like to get the community involved to make Vern viable for any scale of React Native app.

## Install

For now Vern only works programatically as it must set up not only Vite but also Fastify, mostly because it re-uses great work by [Repack](https://www.callstack.com/open-source/re-pack) in order to provide the websocket for communicating with React Native.

Install:

```bash
npm i -d @vite-react-native/vite-react-native
npm i react-dom react react-native
```

Create a file called `dev.js`:

```js
import { create } from '@vite-react-native/vite-react-native'

dev()

async function dev() {
  const { viteServer, start, stop } = await create({
    root: process.cwd(),
    host: '127.0.0.1',
    webConfig: {
      plugins: [],
    },
    buildConfig: {
      plugins: [],
    },
  })

  const { closePromise } = await start()

  viteServer.printUrls()

  process.on('beforeExit', () => {
    stop()
  })

  process.on('SIGINT', () => {
    stop()
  })

  process.on('uncaughtException', (err) => {
    console.log(err?.message || err)
  })

  await closePromise
}
```

Create a minimal app by creating an `index.jsx`:

```js
import { AppRegistry, View } from 'react-native'

AppRegistry.registerComponent('main', () => App)

function App() {
  return <View style={{ width: 100, height: 100, backgroundColor: 'red' }} />
}
```

And your web entry at `index.web.jsx`:

```js
import { createRoot } from 'react-dom/client'

function App() {
  return <View style={{ width: 100, height: 100, backgroundColor: 'red' }} />
}

createRoot(document.querySelector('#root')).render(<App />)
```

And then run it:


```bash
node dev.js
```

This will start a server on `8081` and on `1421`, your native and web servers respectively.

You'll need a React Native app to connect to the native app, and you should be able to hit http://localhost:1421 right away in your browser.

If that worked, well, you're lucky!

We've got [a couple examples in the repo](https://github.com/nate/vite-react-native) that probably are easier to get started with.
