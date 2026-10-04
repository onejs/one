import { createElement } from 'react'
import { AppRegistry } from 'react-native'
import Proof from './proof'
AppRegistry.registerComponent('NativeFeatureTests', () => () => createElement(Proof))
