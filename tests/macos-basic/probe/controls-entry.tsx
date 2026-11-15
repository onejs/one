import { AppRegistry, View } from 'react-native'
import { One } from 'one'
import NativeDevSettings from 'react-native/Libraries/NativeModules/specs/NativeDevSettings'
import { NativeControls } from './Controls'

function ControlsProbe() {
  return (
    <View style={{ flex: 1, padding: 12 }}>
      <NativeControls />
      <One.macOS.Button
        testID="reload-host"
        title="Reload host"
        onPress={() => NativeDevSettings.reload()}
      />
    </View>
  )
}
AppRegistry.registerComponent('main', () => ControlsProbe)
