import { type Root, hydrateRoot } from 'react-dom/client'
import { Root as RouterRoot } from '@vxrn/expo-router'

const routes = import.meta.glob('../app/**/*.tsx')

globalThis['__vxrnVersion'] ||= 0

export function App(props: { path: string }) {
  console.log('rendering again', globalThis['__vxrnVersion'])
  return <RouterRoot version={globalThis['__vxrnVersion']} routes={routes} path={props.path} />
}

function renderApp() {
  if (typeof document === 'undefined') return
  const container = document.querySelector('#root')
  if (!container) throw new Error(`No container element found`)
  const props = globalThis['__vxrnProps'] ?? {}
  const element = <App path={window.location.pathname} {...props} />
  if (globalThis['__vxrnRoot']) {
    globalThis['__vxrnVersion']++
    globalThis['__vxrnRoot'].render(element)
  } else {
    globalThis['__vxrnRoot'] = hydrateRoot(container, element)
  }
}

renderApp()

// if (import.meta.hot) {
//   import.meta.hot.accept('./App', () => {
//     // Re-import the updated App module
//     const NextApp = require('./App').default
//     renderApp()
//   })
// }
