import { One } from 'one'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

// a swiftui NavigationStack push that zooms out of its source tile: the tile is a
// matchedTransitionSource and the destination takes navigationTransition(.zoom), both in
// one's shared namespace. the destination holds react native content, as an app's
// detail screen does.
export default function OneNativeNavigationZoom() {
  const [open, setOpen] = useState(false)
  return (
    <One.iOS.NavigationStack
      style={styles.stack}
      swiftStyle={{ navigationTitleWithText: 'Machines' }}
      testID="one-native-navigation-zoom-stack"
    >
      <One.iOS.ViewSlot
        name="navigationDestination"
        options={{ isPresented: { value: open, onChange: setOpen } }}
        style={styles.stack}
      >
        <One.iOS.VStack alignment="leading" swiftStyle={{ padding: 20 }}>
          <One.iOS.Button
            testID="one-native-navigation-zoom-source"
            onPress={() => setOpen(true)}
            swiftStyle={{ buttonStyle: 'plain' }}
          >
            <One.iOS.ZStack
              swiftStyle={{ width: 160, height: 120, matchedTransitionSource: { id: 'studio' } }}
            >
              <One.iOS.RoundedRectangle fill="#0A84FF" cornerRadius={18} />
              <One.iOS.Text text="studio" swiftStyle={{ fontSize: 22, fontWeight: 'bold', foregroundStyle: '#FFFFFF' }} />
            </One.iOS.ZStack>
          </One.iOS.Button>
        </One.iOS.VStack>
        <One.iOS.ViewSlot.Content>
          <One.iOS.VStack
            swiftStyle={{
              navigationTransition: { kind: 'zoom', sourceID: 'studio' },
              navigationTitleWithText: 'studio',
            }}
          >
            <One.iOS.Slot height={480}>
              <View style={styles.detail} testID="one-native-navigation-zoom-destination">
                <Text style={styles.detailText}>Machine detail</Text>
              </View>
            </One.iOS.Slot>
          </One.iOS.VStack>
        </One.iOS.ViewSlot.Content>
      </One.iOS.ViewSlot>
    </One.iOS.NavigationStack>
  )
}

const styles = StyleSheet.create({
  stack: { flex: 1 },
  detail: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  detailText: { fontSize: 20, fontWeight: '600' },
})
