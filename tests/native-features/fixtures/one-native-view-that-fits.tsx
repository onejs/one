import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeViewThatFits() {
  const [width, setWidth] = useState(180)
  const [axes, setAxes] = useState<'horizontal' | 'vertical' | 'both'>('horizontal')
  const [pressed, setPressed] = useState('none')

  return (
    <View style={styles.screen}>
      <Text>{`Proposal width: ${width}`}</Text>
      <Text>{`Axes: ${axes}`}</Text>
      <Text>{`Pressed: ${pressed}`}</Text>
      <Pressable testID="one-native-view-that-fits-width" onPress={() => setWidth((value) => value === 180 ? 340 : value === 340 ? 80 : 180)}>
        <Text>Change width</Text>
      </Pressable>
      <Pressable testID="one-native-view-that-fits-axes" onPress={() => setAxes((value) => value === 'horizontal' ? 'vertical' : value === 'vertical' ? 'both' : 'horizontal')}>
        <Text>Change axes</Text>
      </Pressable>
      <One.iOS.ViewThatFits axes={axes} style={{ width, height: 70 }} testID="one-native-view-that-fits-container">
        <One.iOS.Button
          label="Wide option"
          onPress={() => setPressed('wide')}
          swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 300, height: 50, alignment: 'center' } }}
        />
        <One.iOS.Button
          label="Compact option"
          onPress={() => setPressed('compact')}
          swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 100, height: 50, alignment: 'center' } }}
        />
      </One.iOS.ViewThatFits>
      <One.iOS.ViewThatFits style={{ width: 180 }} testID="one-native-view-that-fits-default">
        <One.iOS.Text text="Default wide" swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 300, height: 50, alignment: 'center' } }} />
        <One.iOS.Text text="Default compact" swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 100, height: 50, alignment: 'center' } }} />
      </One.iOS.ViewThatFits>
      <One.iOS.Host axis="vertical" style={{ width: 180 }}>
        <One.iOS.ViewThatFits axes="horizontal" testID="one-native-view-that-fits-nested">
          <One.iOS.Text text="Nested wide" swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 300, height: 50, alignment: 'center' } }} />
          <One.iOS.Text text="Nested compact" swiftStyle={{ frameWithWidthAndHeightAndAlignment: { width: 100, height: 50, alignment: 'center' } }} />
        </One.iOS.ViewThatFits>
      </One.iOS.Host>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 12, backgroundColor: '#fff' },
})
