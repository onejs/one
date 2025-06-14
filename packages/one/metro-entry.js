import { createApp } from 'one'
import { ctx } from './metro-entry-ctx.js'

let ONE_ROUTER_ROOT_FOLDER_NAME = process.env.ONE_ROUTER_ROOT_FOLDER_NAME
if (!ONE_ROUTER_ROOT_FOLDER_NAME) {
  console.warn(
    'process.env.ONE_ROUTER_ROOT_FOLDER_NAME is not set, make sure you have your one plugin configured correctly.'
  )
  ONE_ROUTER_ROOT_FOLDER_NAME = 'app'
}

const routes = ctx.keys().reduce((acc, key) => {
  const path = key.replace(/^\.\//, `/${ONE_ROUTER_ROOT_FOLDER_NAME}/`)
  acc[path] = async () => ctx(key)
  return acc
}, {})

createApp({
  routes,
  routerRoot: ONE_ROUTER_ROOT_FOLDER_NAME,
})
