import { createRoot } from 'react-dom/client'
import { Root } from '@vxrn/expo-router'

// @ts-ignore
export const routes = import.meta.glob('../app/**/*.tsx')

export function App({ path }: { path: string }) {
  return <Root routes={routes} path={path} />
}

// should be hydrateRoot once ssred
createRoot(document.querySelector('#root')!).render(<App path={window.location.pathname} />)
