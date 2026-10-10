import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ProbeToolbar } from '../fixtures/bars-button-probe'

/**
 * Control for the button-above-the-bar probe: the same toolbar on a stack
 * screen outside any tab.
 */
export default function ProbeControlScreen() {
  const [lastAction, setLastAction] = useState('none')

  return (
    <View testID="bars-probe-control-screen" style={styles.container}>
      <ProbeToolbar withSpacer onAction={setLastAction} />
      <View style={styles.content}>
        <Text testID="bars-probe-control-title" style={styles.title}>
          Probe Control
        </Text>
        <Text testID="bars-probe-control-last-action" style={styles.status}>
          {lastAction}
        </Text>
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
})
