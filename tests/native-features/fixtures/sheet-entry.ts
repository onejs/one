import { createElement } from 'react'
import { AppRegistry, SafeAreaView } from 'react-native'
import SheetFixture from './one-native-sheet'

function SheetEntry() {
  return createElement(SafeAreaView, { style: { flex: 1 } }, createElement(SheetFixture))
}

AppRegistry.registerComponent('NativeFeatureTests', () => SheetEntry)
