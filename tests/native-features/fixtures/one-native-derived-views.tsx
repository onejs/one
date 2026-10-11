import { Component, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// Swift Charts through Expo UI's Chart props, plus SDK views the generator
// derives from their constructors: scalar, URL, enum, string collection and
// action arguments become props. SubscriptionStoreView has two constructors,
// chosen by which one of groupID and productIDs is set.
export default function OneNativeDerivedViews() {
  const [actions, setActions] = useState(0)
  const [invalid, setInvalid] = useState(false)

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="one-native-derived-views-screen"
    >
      <One.iOS.AsyncImage
        url="https://reactnative.dev/img/tiny_logo.png"
        scale={2}
        testID="one-native-derived-async-image"
      />
      <One.iOS.LocationButton
        title="shareCurrentLocation"
        onAction={() => setActions((count) => count + 1)}
        testID="one-native-derived-location-button"
      />
      <One.iOS.ShortcutsLink testID="one-native-derived-shortcuts-link" />
      <One.iOS.ProductView id="one.native.features.product" testID="one-native-derived-product" />
      <One.iOS.SubscriptionStoreView
        productIDs={['one.native.features.monthly']}
        style={styles.store}
        testID="one-native-derived-subscription-store"
      />
      <One.iOS.Chart
        type="bar"
        data={[
          { x: 'Mon', y: 3 },
          { x: 'Tue', y: 7 },
          { x: 'Wed', y: 5 },
        ]}
        referenceLines={[{ x: 'goal', y: 6 }]}
        barStyle={{ cornerRadius: 4 }}
        showLegend
        style={styles.chart}
        testID="one-native-derived-chart"
      />
      <Text testID="one-native-derived-actions" style={styles.line}>
        {`Location actions: ${actions}`}
      </Text>
      <Pressable
        testID="one-native-derived-invalid"
        style={styles.chip}
        onPress={() => setInvalid(true)}
      >
        <Text>Both constructors</Text>
      </Pressable>
      {invalid ? (
        <Boundary>
          <One.iOS.SubscriptionStoreView groupID="group" productIDs={['monthly']} />
        </Boundary>
      ) : null}
    </ScrollView>
  )
}

class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <View>
        <Text testID="one-native-derived-error" style={styles.line}>
          {`Error: ${this.state.error}`}
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingTop: 70, gap: 12 },
  store: { height: 320 },
  chart: { height: 220 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  line: { fontSize: 14 },
})
