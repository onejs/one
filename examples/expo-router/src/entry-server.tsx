import { renderToString } from '@vxrn/expo-router'
import { App, routes } from './entry-web'

export const render = async ({ path, props }: { path: string; props: Object }) => {
  return renderToString(<App path={path} {...props} />, {
    routes,
  })
}
