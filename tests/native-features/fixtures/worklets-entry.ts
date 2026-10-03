import { createElement } from 'react'
import { AppRegistry, SafeAreaView } from 'react-native'
import WorkletsFixture from './one-native-gestures'

function WorkletsApp() {
  return createElement(
    SafeAreaView,
    { style: { flex: 1, backgroundColor: '#fff' } },
    createElement(WorkletsFixture)
  )
}

AppRegistry.registerComponent('NativeFeatureTests', () => WorkletsApp)
