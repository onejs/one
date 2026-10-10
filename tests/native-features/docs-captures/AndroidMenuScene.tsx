import { One } from 'one'
import { Text, View } from 'react-native'

// a photo card with a context menu. the capture long presses the card, so the native popup
// opens anchored to it, and takes the whole screen.
export function AndroidMenuScene() {
  return (
    <One.Android.ContextMenu
      accessibilityLabel="Photo options"
      items={[
        { type: 'action', id: 'share', title: 'Share' },
        { type: 'action', id: 'rename', title: 'Rename' },
        { type: 'toggle', id: 'favorite', title: 'Favorite', values: [true] },
        { type: 'action', id: 'delete', title: 'Delete' },
      ]}
      onAction={() => {}}
      onValueChange={() => {}}
    >
      <View
        style={{
          width: 280,
          height: 180,
          borderRadius: 24,
          backgroundColor: '#5B8E7D',
          justifyContent: 'flex-end',
          padding: 18,
        }}
      >
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Kyoto</Text>
        <Text style={{ color: 'white', fontSize: 15, opacity: 0.85 }}>June 3 – 10</Text>
      </View>
    </One.Android.ContextMenu>
  )
}
