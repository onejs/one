import { Root, render } from '@vxrn/router'

const routes = import.meta.glob('../app/**/*.tsx')

export function App(props: { path: string }) {
  return <Root routes={routes} path={props.path} />
}

render(App)
