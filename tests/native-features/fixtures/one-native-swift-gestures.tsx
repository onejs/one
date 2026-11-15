import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// SwiftUI gestures through swiftStyle: a drag reporting every change and its end with
// velocity and prediction, with a minimum distance option.
export default function OneNativeSwiftGestures() {
  const [changes, setChanges] = useState(0)
  const [ended, setEnded] = useState('pending')

  return (
    <View style={styles.screen} testID="one-native-swift-gestures-screen">
      <One.iOS.Text
        text="Drag me"
        testID="one-native-swift-gestures-drag"
        style={styles.target}
        swiftStyle={{
          frameWithWidthAndHeightAndAlignment: { width: 160, height: 160, alignment: 'center' },
          // a framed Text only hit-tests its glyphs; the rect shape makes the whole frame the target.
          contentShape: 'rect',
          gesture: {
            kind: 'drag',
            minimumDistance: 4,
            onChanged: () => setChanges((count) => count + 1),
            onEnded: ({ translation, velocity, predictedEndTranslation }) =>
              setEnded([
                `translation ${Math.round(translation.width)},${Math.round(translation.height)}`,
                `velocity ${Math.round(velocity.width)},${Math.round(velocity.height)}`,
                `predicted ${Math.round(predictedEndTranslation.width)},${Math.round(predictedEndTranslation.height)}`,
              ].join(' · ')),
          },
        }}
      />
      <Text testID="one-native-swift-gestures-changes">{`Changes: ${changes}`}</Text>
      <Text testID="one-native-swift-gestures-ended">{`Ended: ${ended}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 90, paddingHorizontal: 20, gap: 16, backgroundColor: '#FFFFFF' },
  target: { width: 160, height: 160, backgroundColor: '#DCE6FA' },
})
