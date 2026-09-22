import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ProbeToolbar } from '../../../fixtures/bars-button-probe'

export default function ProbeMainScreen() {
  const [withSpacer, setWithSpacer] = useState(true)
  const [lastAction, setLastAction] = useState('none')

  return (
    <View testID="bars-probe-screen" style={styles.container}>
      <ProbeToolbar withSpacer={withSpacer} onAction={setLastAction} />
      <View style={styles.content}>
        <Text testID="bars-probe-title" style={styles.title}>
          Button Probe
        </Text>
        <Text testID="bars-probe-last-action" style={styles.status}>
          {lastAction}
        </Text>
        <Text testID="bars-probe-spacer-state" style={styles.status}>
          {withSpacer ? 'spacer-on' : 'spacer-off'}
        </Text>
        <Pressable
          testID="bars-probe-spacer-toggle"
          style={styles.toggle}
          onPress={() => setWithSpacer((value) => !value)}
        >
          <Text style={styles.toggleText}>Toggle spacer</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 15,
    color: '#333',
  },
  toggle: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
