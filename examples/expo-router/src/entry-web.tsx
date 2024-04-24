import { hydrateRoot } from 'react-dom/client'
import { Root } from '@vxrn/expo-router'

// @ts-ignore
export const routes = import.meta.glob('../app/**/*.tsx')

export function App(props: { path: string }) {
  return <Root routes={routes} path={props.path} />
}

if (typeof document !== 'undefined') {
  const props = globalThis['__vxrnProps'] ?? {}

  hydrateRoot(document.querySelector('#root')!, <App path={window.location.pathname} {...props} />)
}
