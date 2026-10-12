import { StyleSheet, Text, View } from 'react-native'

/**
 * Generic double-bar accessory. Mirrors the shape of Contrast's
 * demos/apple-music-native MiniPlayer (bottomAccessory + placement) with
 * generic content: the placement it renders for is always visible so the
 * suite can assert regular vs inline.
 */
export function DoubleBarAccessory({ placement }: { placement: 'regular' | 'inline' }) {
  return (
    <View
      testID={`bars-double-accessory-${placement}`}
      style={[styles.accessory, placement === 'inline' && styles.accessoryInline]}
    >
      <View style={styles.artwork} />
      <View style={styles.meta}>
        <Text testID={`bars-double-accessory-title-${placement}`} style={styles.title}>
          Sample Item
        </Text>
        <Text
          testID={`bars-double-accessory-placement-${placement}`}
          style={styles.placement}
        >
          {placement}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accessoryInline: {
    paddingVertical: 4,
  },
  artwork: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ff375f',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  placement: {
    fontSize: 12,
    color: '#888',
  },
})
