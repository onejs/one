// sorry - don't want this file here but need to fix entryNative

import { AppRegistry, LogBox } from 'react-native'
import { App } from './src/App'

AppRegistry.registerComponent('main', () => App)

LogBox.install()
