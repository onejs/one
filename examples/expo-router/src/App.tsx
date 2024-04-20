import { Root } from '@vxrn/expo-router'

// @ts-ignore
export const routes = import.meta.glob('../app/**/*.tsx')

export function App({ path }: { path: string }) {
  return <Root routes={routes} path={path} />
}
