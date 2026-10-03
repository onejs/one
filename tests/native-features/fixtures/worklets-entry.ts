import { createElement } from 'react'
import { AppRegistry } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import WorkletsFixture from './one-native-gestures'

function WorkletsApp() {
  return createElement(
    SafeAreaProvider,
    null,
    createElement(
      SafeAreaView,
      { style: { flex: 1, backgroundColor: '#fff' } },
      createElement(WorkletsFixture)
    )
  )
}

AppRegistry.registerComponent('NativeFeatureTests', () => WorkletsApp)
