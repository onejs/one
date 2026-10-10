import { One } from 'one'
import { View } from 'react-native'

// a now playing card laid out only with swiftui stacks: zstack artwork, a vstack of
// text, and an hstack of controls pushed apart by spacers.
export function IosStacksScene() {
  return (
    <View
      style={{
        width: 300,
        borderRadius: 36,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
        padding: 22,
      }}
    >
      <One.iOS.VStack spacing={14} alignment="leading" style={{ width: 256 }}>
        <One.iOS.ZStack alignment="bottomTrailing">
          <One.iOS.RoundedRectangle
            fill="#5856D6"
            cornerRadius={22}
            swiftStyle={{ width: 256, height: 180 }}
          />
          <One.iOS.Image
            systemName="music.note"
            swiftStyle={{ fontSize: 64, foregroundStyle: '#ffffff', padding: 22 }}
          />
        </One.iOS.ZStack>
        <One.iOS.VStack spacing={2} alignment="leading">
          <One.iOS.Text text="Evening Tide" swiftStyle={{ fontSize: 22, fontWeight: 'bold' }} />
          <One.iOS.Text
            text="The Harbor Lights"
            swiftStyle={{ fontSize: 16, foregroundStyle: '#8E8E93' }}
          />
        </One.iOS.VStack>
        <One.iOS.HStack alignment="center">
          <One.iOS.Spacer />
          <One.iOS.Image systemName="backward.fill" swiftStyle={{ fontSize: 26 }} />
          <One.iOS.Spacer />
          <One.iOS.Image systemName="pause.fill" swiftStyle={{ fontSize: 38 }} />
          <One.iOS.Spacer />
          <One.iOS.Image systemName="forward.fill" swiftStyle={{ fontSize: 26 }} />
          <One.iOS.Spacer />
        </One.iOS.HStack>
      </One.iOS.VStack>
    </View>
  )
}
