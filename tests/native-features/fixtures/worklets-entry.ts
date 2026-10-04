import { createElement } from 'react'
import { AppRegistry } from 'react-native'
import { SafeAreaView } from '../../../packages/one/src/safe-area-context'
// the server resolves this to the fixture named by its --fixture argument
import WorkletsFixture from 'worklets-fixture'

function WorkletsApp() {
  return createElement(
    SafeAreaView,
    { style: { flex: 1, backgroundColor: '#fff' } },
    createElement(WorkletsFixture)
  )
}

AppRegistry.registerComponent('NativeFeatureTests', () => WorkletsApp)
