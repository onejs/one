import { AppRegistry } from 'react-native'
import App from '../App'

// support both RN
AppRegistry.registerComponent('bare', () => App)
// and Expo Go
AppRegistry.registerComponent('main', () => App)
