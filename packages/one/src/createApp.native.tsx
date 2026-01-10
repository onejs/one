import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import type { One } from './vite/types'
import './polyfills-mobile'
import { Root } from './Root'
import './setup'
import type { CreateAppProps } from './createApp'

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

export function createApp(options: CreateAppProps): void {
  const App = () => {
    const contents = (
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

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
  }
}
