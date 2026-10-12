import { One } from 'one'
import { View } from 'react-native'

const symbols = [
  { systemName: 'sun.max.fill', symbolRenderingMode: 'multicolor', color: undefined },
  { systemName: 'wifi', symbolRenderingMode: 'hierarchical', variableValue: 0.6, color: '#007AFF' },
  { systemName: 'heart.circle.fill', symbolRenderingMode: 'hierarchical', color: '#FF2D55' },
  { systemName: 'bell.badge.fill', symbolRenderingMode: 'multicolor', color: undefined },
] as const

// swiftui shapes, sf symbols in their rendering modes, and an empty state, in a card.
export function IosMediaScene() {
  return (
    <View
      style={{
        width: 320,
        borderRadius: 36,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
        padding: 22,
        gap: 22,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <One.iOS.Circle fill="#FF9500" style={{ width: 48, height: 48 }} />
        <One.iOS.Capsule fill="#34C759" style={{ width: 72, height: 40 }} />
        <One.iOS.RoundedRectangle fill="#5856D6" cornerRadius={12} style={{ width: 48, height: 48 }} />
        <One.iOS.UnevenRoundedRectangle
          fill="#FF2D55"
          topLeadingRadius={24}
          bottomTrailingRadius={24}
          style={{ width: 48, height: 48 }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {symbols.map(({ color, ...symbol }) => (
          <One.iOS.Image
            key={symbol.systemName}
            {...symbol}
            style={{ width: 48, height: 48 }}
            swiftStyle={{ fontSize: 40, foregroundStyle: color }}
          />
        ))}
      </View>
      <One.iOS.ContentUnavailableView
        title="No Photos"
        systemImage="photo.on.rectangle"
        description="Photos you add will show up here."
        actions={[{ id: 'add', label: 'Add Photos' }]}
        style={{ height: 230 }}
      />
    </View>
  )
}
