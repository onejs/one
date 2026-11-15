import { AppRegistry, View } from 'react-native'
import { One } from 'one'
import NativeDevSettings from 'react-native/Libraries/NativeModules/specs/NativeDevSettings'
import { SymbolImages } from './SymbolImages'

function SymbolProbe() {
  return (
    <View style={{ flex: 1 }}>
      <SymbolImages />
      <One.macOS.Button
        testID="reload-host"
        title="Reload host"
        onPress={() => NativeDevSettings.reload()}
      />
    </View>
  )
}
AppRegistry.registerComponent('main', () => SymbolProbe)
