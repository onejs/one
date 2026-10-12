import { One } from 'one'
import { Text, View } from 'react-native'

const roles = [
  ['primary', 'onPrimary'],
  ['primaryContainer', 'onPrimaryContainer'],
  ['secondary', 'onSecondary'],
  ['secondaryContainer', 'onSecondaryContainer'],
  ['tertiary', 'onTertiary'],
  ['tertiaryContainer', 'onTertiaryContainer'],
  ['error', 'onError'],
  ['surfaceVariant', 'onSurfaceVariant'],
] as const

// dynamic material roles as swatches, each labeled in its matching on color.
export function AndroidColorScene() {
  const color = One.Android.Color.dynamic
  return (
    <View
      style={{
        width: 340,
        padding: 14,
        gap: 8,
        borderRadius: 28,
        backgroundColor: color.surface,
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {roles.map(([role, on]) => (
        <View
          key={role}
          style={{
            width: 152,
            height: 64,
            borderRadius: 16,
            padding: 12,
            justifyContent: 'flex-end',
            backgroundColor: color[role],
          }}
        >
          <Text numberOfLines={1} style={{ color: color[on], fontSize: 13, fontWeight: '600' }}>
            {role}
          </Text>
        </View>
      ))}
    </View>
  )
}
