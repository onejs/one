import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import './polyfills-mobile'
import './setup'
import { Root } from './Root'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

export function createApp(options: CreateAppProps): void {
  const App = () => <Root isClient routes={options.routes} path="/" />

  AppRegistry.registerComponent('main', () => App)

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
  }
}
