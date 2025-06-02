import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import type { One } from './vite/types'
import './polyfills-mobile'
import { Root } from './Root'
import './setup'
import type { CreateAppProps } from './createApp'

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

console.warn('createApp native !!!')
export function createApp(options: CreateAppProps): void {
  console.warn('createApp called !!!')
  const App = () => {
    console.warn('createApp App called !!!')
    let contents = (
      <Root
        isClient
        flags={options.flags}
        routes={options.routes}
        routerRoot={options.routerRoot}
        path="/"
      />
    )

    return contents
  }

  AppRegistry.registerComponent('main', () => App)
  console.warn('AppRegistry.registerComponent')

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
    console.warn('AppRegistry.registerComponent for process.env.ONE_APP_NAME')
  }
}
