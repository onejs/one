import { AppRegistry, LogBox } from 'react-native'
import { App } from './entry-web'

AppRegistry.registerComponent('main', () => App)

LogBox.install()
