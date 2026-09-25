import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// exercises the network state api against the live radio: a one-shot read
// plus a change listener whose first event proves the native monitor is
// publishing. results travel as labels because RN Text testIDs vanish from
// the accessibility snapshot while Pressable IDs survive.
export default function OneNativeNetwork() {
  const [state, setState] = useState('none')
  const [events, setEvents] = useState(0)
  useEffect(() => {
    One.Network.getState().then((next) =>
      setState(`${next.type} ${next.isConnected} ${next.isInternetReachable}`)
    )
    const subscription = One.Network.addStateListener((next) => {
      setEvents((count) => count + 1)
      setState(`${next.type} ${next.isConnected} ${next.isInternetReachable}`)
    })
    return () => subscription.remove()
  }, [])
  return (
    <View style={styles.screen}>
      <Text>{`State: ${state}`}</Text>
      <Text>{`Events: ${events}`}</Text>
      <Pressable
        testID="one-native-network-refresh"
        style={styles.chip}
        onPress={async () => {
          const next = await One.Network.getState()
          setState(`${next.type} ${next.isConnected} ${next.isInternetReachable}`)
        }}
      >
        <Text>Refresh state</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
