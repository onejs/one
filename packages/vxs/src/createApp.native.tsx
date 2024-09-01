import { Root } from './Root'
import { AppRegistry, LogBox } from 'react-native'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

// TODO temporary
LogBox.ignoreLogs([
  /Sending .* with no listeners registered/,
  /Each child in a list should have a unique/,
])

export function createApp(options: CreateAppProps): void {
  console.info(
    `createApp(${process.env.VXS_APP_NAME}) routes: ${Object.keys(options.routes || []).join('\n')}`
  )

  const App = () => <Root isClient routes={options.routes} path="/" />

  AppRegistry.registerComponent('main', () => App)

  // TODO remove once we get a nice setup in tamagui repo for building native app and loading it
  AppRegistry.registerComponent('tamaguikitchensink', () => App)

  if (process.env.VXS_APP_NAME) {
    AppRegistry.registerComponent(process.env.VXS_APP_NAME, () => App)
  }
}
