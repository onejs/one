import { renderToString } from '@vxrn/expo-router'
import { App, routes } from './App'

export const render = async ({ path }: { path: string }) => {
  return renderToString(<App path={path} />, {
    routes,
  })
}
