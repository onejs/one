import { renderToString } from '@vxrn/router/server-render'
import { App } from './entry-web'

export const render = async ({ path, props }: { path: string; props: Object }) => {
  console.info(`[entry-server] render path ${path}`)
  const out = await renderToString(<App path={path} {...props} />)
  // console.info(`[entry-server] rendered`, out)
  return out
}
