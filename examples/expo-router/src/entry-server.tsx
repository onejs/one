// @ts-ignore
import { renderToString } from '@vxrn/expo-router/render'
import { App, routes } from './entry-web'
import * as Any from 'react/jsx-runtime'

console.log('wtf?', Any)

export const render = async ({ path, props }: { path: string; props: Object }) => {
  return renderToString(<App path={path} {...props} />, {
    routes,
  })
}
