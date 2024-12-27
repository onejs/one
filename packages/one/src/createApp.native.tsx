import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import './polyfills-mobile'
import './setup'
import { Root } from './Root'
// import { ReactScan } from 'react-scan/native'

export type CreateAppProps = { routes: Record<string, () => Promise<unknown>> }

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

export function createApp(options: CreateAppProps): void {
  const App = () => {
    let contents = <Root isClient routes={options.routes} path="/" />

    // if (process.env.ONE_ENABLE_REACT_SCAN) {
    //   console.warn(`React Scan enabled with options: ${process.env.ONE_ENABLE_REACT_SCAN}`)
    //   contents = (
    //     <ReactScan options={JSON.parse(process.env.ONE_ENABLE_REACT_SCAN)}>{contents}</ReactScan>
    //   )
    // }

    return contents
  }

  AppRegistry.registerComponent('main', () => App)

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
  }
}
