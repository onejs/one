import { AppRegistry, Pressable, Text, View } from 'react-native'
import NativeDevSettings from 'react-native/Libraries/NativeModules/specs/NativeDevSettings'
import { Gradients } from './Gradients'

function GradientProbe() {
  return <View style={{ flex: 1, padding: 16, backgroundColor: '#f5f5f5' }}>
    <Gradients />
    <Pressable testID="reload-host" accessibilityRole="button" onPress={() => NativeDevSettings.reload()}>
      <Text>Reload host</Text>
    </Pressable>
  </View>
}

AppRegistry.registerComponent('main', () => GradientProbe)
