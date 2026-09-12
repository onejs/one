import { SplitView } from '@vxrn/native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

function Detail() {
  return (
    <View style={styles.detail} testID="native-split-detail">
      <Text style={styles.detailTitle}>Split detail mounted</Text>
    </View>
  )
}

export function NativeSplitView({ onExit }: { onExit: () => void }) {
  const [selection, setSelection] = useState('first')

  return (
    <SplitView slot={Detail}>
      <SplitView.Column>
        <View style={styles.sidebar} testID="native-split-sidebar">
          <Text style={styles.title}>Retained SplitView mounted</Text>
          <Pressable
            accessibilityRole="button"
            testID="native-split-select"
            style={styles.action}
            onPress={() => setSelection('second')}
          >
            <Text style={styles.actionText}>Select second split item</Text>
          </Pressable>
          <Text testID="native-split-selection">Split selection: {selection}</Text>
          <Pressable
            accessibilityRole="button"
            testID="native-split-exit"
            style={styles.action}
            onPress={onExit}
          >
            <Text style={styles.actionText}>Return to profile</Text>
          </Pressable>
        </View>
      </SplitView.Column>
    </SplitView>
  )
}

const styles = StyleSheet.create({
  sidebar: { flex: 1, padding: 24, gap: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: '700' },
  action: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#1465c0', fontSize: 16, fontWeight: '600' },
  detail: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 20, fontWeight: '600' },
})
