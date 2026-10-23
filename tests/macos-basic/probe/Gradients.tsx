import { memo, useState } from 'react'
import { PlatformColor, Pressable, Text, View } from 'react-native'

let renders = 0

const AppearanceGradient = memo(function AppearanceGradient() {
  renders++
  return <View>
    <Text>{`Semantic stops renders ${renders}`}</Text>
    <View testID="gradient-semantic" style={{ width: 180, height: 28, backgroundImage: [{
      type: 'linear-gradient', direction: '90deg', colorStops: [
        { color: PlatformColor('labelColor') },
        { color: PlatformColor('windowBackgroundColor') },
      ],
    }] }} />
  </View>
})

export function Gradients() {
  const [wide, setWide] = useState(false)
  return <View testID="gradients" style={{ gap: 4, marginVertical: 4 }}>
    <Pressable testID="gradient-resize" accessibilityRole="button" onPress={() => setWide(!wide)}>
      <Text>{`AFTER native linear gradients: ${wide ? 'wide' : 'narrow'} (resize)`}</Text>
    </Pressable>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View testID="gradient-wash" style={{ width: wide ? 240 : 120, height: 32, borderRadius: 12, borderWidth: 2, borderColor: '#ff8800', backgroundColor: '#ffffff', backgroundImage: 'linear-gradient(90deg, rgba(0, 100, 240, 0.5), transparent)' }}>
        <Text style={{ alignSelf: 'center', color: '#000000' }}>Chip</Text>
      </View>
      <View testID="gradient-angle" style={{ width: wide ? 240 : 120, height: 32, backgroundImage: 'linear-gradient(45deg, red, blue)' }} />
      <View testID="gradient-corner" style={{ width: 120, height: 32, backgroundImage: 'linear-gradient(to top right, red, blue)' }} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View testID="gradient-stops" style={{ width: 180, height: 28, backgroundImage: 'linear-gradient(90deg, red -50%, lime 25%, blue 15%, white 150%)' }} />
      <View testID="gradient-layers" style={{ width: 120, height: 28, backgroundImage: 'linear-gradient(90deg, rgba(255,0,0,0.5), transparent), linear-gradient(180deg, blue, blue)' }} />
      <AppearanceGradient />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View testID="gradient-semantic-clear" style={{ width: 120, height: 28, backgroundColor: '#ffffff', backgroundImage: [{
        type: 'linear-gradient', direction: '90deg', colorStops: [
          { color: PlatformColor('controlAccentColor') },
          { color: PlatformColor('clearColor') },
        ],
      }] }} />
      <View testID="gradient-point-stops" style={{ width: 180, height: 28, backgroundImage: [{
        type: 'linear-gradient', direction: '90deg', colorStops: [
          { color: 'red', positions: [20] },
          { color: 'lime' },
          { color: 'blue', positions: [80] },
        ],
      }] }} />
    </View>
  </View>
}
