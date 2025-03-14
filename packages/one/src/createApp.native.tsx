import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import './polyfills-mobile'
import { Root } from './Root'
import './setup'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

export function createApp(options: CreateAppProps): void {
  const App = () => {
    let contents = <Root isClient routes={options.routes} path="/" />

    return contents
  }

  AppRegistry.registerComponent('main', () => App)

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
  }
}
