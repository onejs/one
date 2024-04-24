# Get Started

vxrn is an experimental package to build and serve your React Native apps using only Vite.

## Install

We have a very experimental create package now with some template starters:

```bash
npx create vxrn@latest
```

Install:

```bash
npm i -d vxrn
```

You can use it directly in your shell:

```bash
npx vxrn dev # runs a dev server
npx vxrn build # builds a production web app
```

Or programmatically, for example if you have a `dev.js` file:

```js
import { createDevServer } from 'vxrn'

main()

async function main() {
  const { viteServer, start, stop } = await createDevServer({
    root: process.cwd(),
    host: '127.0.0.1',
    webConfig: {
      plugins: [],
    },
    nativeConfig: {
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
    console.error(err?.message || err)
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

Add your web entry at `index.web.jsx`:

```js
import { createRoot } from 'react-dom/client'
import { View } from 'react-native'

function App() {
  return <View style={{ width: 100, height: 100, backgroundColor: 'red' }} />
}

createRoot(document.querySelector('#root')).render(<App />)
```

And `index.html`:

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.web.jsx"></script>
  </body>
</html>
```

And then run it:

```bash
node dev.js
```

This will start a server on `8081`, which you can now see the web version at http://localhost:8081 or through a pre-built React Native or Expo Go client, by entering the above url.
