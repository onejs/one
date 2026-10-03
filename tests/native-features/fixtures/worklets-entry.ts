import { createElement } from 'react'
import { AppRegistry } from 'react-native'
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from '../../../packages/one/src/safe-area-context'
import WorkletsFixture from './one-native-gestures'

function WorkletsApp() {
  return createElement(
    SafeAreaProvider,
    { initialMetrics: initialWindowMetrics },
    createElement(
      SafeAreaView,
      { style: { flex: 1, backgroundColor: '#fff' } },
      createElement(WorkletsFixture)
    )
  )
}

AppRegistry.registerComponent('NativeFeatureTests', () => WorkletsApp)
