import { createElement } from 'react'
import { AppRegistry } from 'react-native'
import { SafeAreaView } from '../../../packages/one/src/safe-area-context'
import WorkletsFixture from './one-native-gestures'

function WorkletsApp() {
  return createElement(
    SafeAreaView,
    { style: { flex: 1, backgroundColor: '#fff' } },
    createElement(WorkletsFixture)
  )
}

AppRegistry.registerComponent('NativeFeatureTests', () => WorkletsApp)
