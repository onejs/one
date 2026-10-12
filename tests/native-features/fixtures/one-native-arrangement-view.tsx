import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type Style = 'automatic' | 'split' | 'overlay'

export default function OneNativeArrangementViewFixture() {
  const [style, setStyle] = useState<Style>('automatic')

  return (
    <View style={styles.screen} testID="arrangement-container">
      <Text testID="arrangement-current-style">{`Arrangement style: ${style}`}</Text>
      <View style={styles.controls}>
        {(['automatic', 'split', 'overlay'] as const).map((next) => (
          <Pressable key={next} testID={`style-btn-${next}`} onPress={() => setStyle(next)} style={styles.control}>
            <Text>{next}</Text>
          </Pressable>
        ))}
      </View>
      <One.iOS.ArrangementView
        arrangementViewStyle={style}
        splitArrangementLayoutRatio={0.5}
        style={styles.arrangement}
        testID="swift-arrangement-view"
      >
        <One.iOS.ArrangementView.Primary testID="arrangement-primary-pane">
          <View style={styles.pane}><Text>Leading / Primary</Text></View>
        </One.iOS.ArrangementView.Primary>
        <One.iOS.ArrangementView.Secondary testID="arrangement-secondary-pane">
          <View style={styles.pane}><Text>Detail / Secondary</Text></View>
        </One.iOS.ArrangementView.Secondary>
      </One.iOS.ArrangementView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, backgroundColor: '#FFFFFF' },
  controls: { flexDirection: 'row' },
  control: { padding: 12 },
  arrangement: { flex: 1 },
  pane: { flex: 1, padding: 16 },
})
