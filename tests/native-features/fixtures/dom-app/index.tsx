import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import OneDOMFixture from '../one-dom'
import OneNativeUpdates from '../one-native-updates'

export default function DOMProofApp() {
  const [screen, setScreen] = useState<'dom' | 'updates'>('dom')

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: screen === 'dom' }}
          testID="one-dom-show-dom"
          onPress={() => setScreen('dom')}
          style={{ padding: 12, backgroundColor: '#e2e8f0' }}
        >
          <Text>DOM</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: screen === 'updates' }}
          testID="one-dom-show-updates"
          onPress={() => setScreen('updates')}
          style={{ padding: 12, backgroundColor: '#e2e8f0' }}
        >
          <Text>Updates</Text>
        </Pressable>
      </View>
      {screen === 'dom' ? <OneDOMFixture /> : <OneNativeUpdates />}
    </View>
  )
}
