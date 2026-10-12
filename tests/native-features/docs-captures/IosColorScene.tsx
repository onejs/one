import { One } from 'one'
import { Text, View } from 'react-native'

const tints = [
  'systemRed',
  'systemOrange',
  'systemYellow',
  'systemGreen',
  'systemMint',
  'systemTeal',
  'systemCyan',
  'systemBlue',
  'systemIndigo',
  'systemPurple',
  'systemPink',
  'systemBrown',
] as const
const grays = ['systemGray', 'systemGray2', 'systemGray3', 'systemGray4', 'systemGray5', 'systemGray6'] as const

// uikit semantic colors as swatches on the system background.
export function IosColorScene() {
  return (
    <View
      style={{
        width: 320,
        borderRadius: 36,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: One.iOS.Color.systemBackground,
        padding: 22,
        gap: 18,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, justifyContent: 'space-between' }}>
        {tints.map((name) => (
          <View key={name} style={{ width: 64, alignItems: 'center', gap: 6 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: One.iOS.Color[name] }} />
            <Text style={{ fontSize: 11, color: One.iOS.Color.secondaryLabel }}>{name.slice(6)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', borderRadius: 12, overflow: 'hidden' }}>
        {grays.map((name) => (
          <View key={name} style={{ flex: 1, height: 36, backgroundColor: One.iOS.Color[name] }} />
        ))}
      </View>
    </View>
  )
}
