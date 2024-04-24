import { renderToString } from '@vxrn/expo-router/render'
import { App } from './entry-web'

export const render = async ({ path, props }: { path: string; props: Object }) => {
  console.info(`[entry-server] render path ${path}`)
  return renderToString(<App path={path} {...props} />)
}
