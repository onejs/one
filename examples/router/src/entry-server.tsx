import { renderToString } from '@vxrn/router/server-render'
import { App } from './entry-web'

export const render = async ({ path }: { path: string }) => {
  console.info(`[entry-server] render path ${path}`)
  return await renderToString(<App path={path} />)
}
