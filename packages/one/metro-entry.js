// initialize globals before configured setup, whose side-effect import is eager
// even when metro defers the named createApp import.
import 'react-native/Libraries/Core/InitializeCore'
import './dist/esm/polyfills-mobile.native.js'

// configured setup is injected after these imports by one-router-metro.
import { createApp } from 'one'
import { ctx } from './metro-entry-ctx.js'

let ONE_ROUTER_ROOT_FOLDER_NAME = process.env.ONE_ROUTER_ROOT_FOLDER_NAME
if (!ONE_ROUTER_ROOT_FOLDER_NAME) {
  console.warn(
    'process.env.ONE_ROUTER_ROOT_FOLDER_NAME is not set, make sure you have your one plugin configured correctly.'
  )
  ONE_ROUTER_ROOT_FOLDER_NAME = 'app'
}

const linking = process.env.ONE_ROUTER_LINKING_CONFIG

const routes = ctx.keys().reduce((acc, key) => {
  const path = key.replace(/^\.\//, `/${ONE_ROUTER_ROOT_FOLDER_NAME}/`)
  acc[path] = async () => ctx(key)
  return acc
}, {})

createApp({
  routes,
  routerRoot: ONE_ROUTER_ROOT_FOLDER_NAME,
  linking,
})
