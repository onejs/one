import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type DeviceInfo = Awaited<ReturnType<typeof One.iOS.Device.getInfo>>

export default function OneNativeDevice() {
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [error, setError] = useState('none')

  const read = async () => {
    try {
      setInfo(await One.iOS.Device.getInfo())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Model: ${info?.model ?? 'pending'}`}</Text>
      <Text>{`System: ${info ? `${info.systemName} ${info.systemVersion}` : 'pending'}`}</Text>
      <Text>{`Idiom: ${info?.interfaceIdiom ?? 'pending'}`}</Text>
      <Text>{`Simulator: ${info ? String(info.isSimulator) : 'pending'}`}</Text>
      <Text>{`Vendor: ${info?.vendorIdentifier ?? 'none'}`}</Text>
      <Text>{`Error: ${error}`}</Text>
      <Pressable testID="one-native-device-read" style={styles.button} onPress={read}>
        <Text>Read device</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
