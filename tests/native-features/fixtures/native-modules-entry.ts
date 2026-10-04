import 'react-native/setup-env'
import { AppRegistry } from 'react-native'
import '../../../packages/one/src/polyfills-mobile'
import NativeModulesProof from './one-native-modules'

AppRegistry.registerComponent('NativeFeatureTests', () => NativeModulesProof)
