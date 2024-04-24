import { createRoot } from 'react-dom/client'
import { Root } from '@vxrn/expo-router'

// @ts-ignore
export const routes = import.meta.glob('../app/**/*.tsx')

export function App(props: { path: string }) {
  console.info('render App', props.path)
  return <Root routes={routes} path={props.path} />
}

// should be hydrateRoot once ssred
if (typeof document !== 'undefined') {
  const props = globalThis['__vxrnProps'] ?? {}

  createRoot(document.querySelector('#root')!).render(
    <App path={window.location.pathname} {...props} />
  )
}
