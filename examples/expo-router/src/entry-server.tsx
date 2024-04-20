import { renderToString } from '@vxrn/expo-router'
import { App, routes } from './entry-web'

export const render = async ({ path }: { path: string }) => {
  return renderToString(<App path={path} />, {
    routes,
  })
}
