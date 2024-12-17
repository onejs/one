import './polyfills-mobile'
import './setup'
import { Root } from './Root'
import { AppRegistry, LogBox } from 'react-native'

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
