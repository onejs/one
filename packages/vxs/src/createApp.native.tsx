// TODO HACK why is window being defined????
// @ts-ignore
delete globalThis.window

import * as RootDir from './Root'
import { AppRegistry } from 'react-native'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

console.log('RootDir', RootDir)

export function createApp(options: CreateAppProps): void {
  const App = () => <RootDir.Root isClient routes={options.routes} path="/" />
  AppRegistry.registerComponent('main', () => App)
  AppRegistry.registerComponent('tamaguikitchensink', () => App)
}
