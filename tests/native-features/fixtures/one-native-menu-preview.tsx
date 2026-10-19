import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const items = [
  { type: 'action' as const, id: 'preview-open', title: 'Open preview item' },
  { type: 'action' as const, id: 'preview-share', title: 'Share preview item' },
]

export default function OneNativeMenuPreview() {
  const [variant, setVariant] = useState<'alpha' | 'beta'>('alpha')
  const [mounted, setMounted] = useState(true)
  const [lastAction, setLastAction] = useState('none')
  const [plainAction, setPlainAction] = useState('none')
  const [box, setBox] = useState({ width: 240, height: 120 })

  return (
    <View style={styles.screen} testID="one-native-menu-preview-screen">
      <Text>{`Preview variant: ${variant}`}</Text>
      <Text>{`Preview menu mounted: ${mounted ? 'yes' : 'no'}`}</Text>
      <Text>{`Last action: ${lastAction}`}</Text>
      <Text>{`Plain action: ${plainAction}`}</Text>
      <Text>{`Preview box: ${box.width}x${box.height}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Swap preview"
        onPress={() => setVariant((value) => (value === 'alpha' ? 'beta' : 'alpha'))}
      >
        <Text>Swap preview</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Resize while open"
        onPress={() => {
          // fires long after the menu presents, so the box change always
          // lands mid-presentation rather than racing it.
          setTimeout(() => setBox({ width: 300, height: 180 }), 6000)
        }}
      >
        <Text>Resize while open</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mounted ? 'Remove preview menu' : 'Restore preview menu'}
        onPress={() => setMounted((value) => !value)}
      >
        <Text>{mounted ? 'Remove preview menu' : 'Restore preview menu'}</Text>
      </Pressable>
      {mounted && (
        <One.iOS.ContextMenu
          testID="one-native-menu-preview-menu"
          items={items}
          onAction={setLastAction}
          preview={
            <View
              testID="one-native-menu-preview-card"
              style={[styles.preview, { width: box.width, height: box.height }]}
              accessibilityLabel={`Preview card ${variant}`}
            >
              <Text>{variant === 'alpha' ? 'Preview alpha #4129' : 'Preview beta #9021'}</Text>
            </View>
          }
          previewWidth={box.width}
          previewHeight={box.height}
        >
          <View testID="one-native-menu-preview-trigger" style={styles.trigger}>
            <Text>Hold for preview</Text>
          </View>
        </One.iOS.ContextMenu>
      )}
      <One.iOS.ContextMenu
        testID="one-native-menu-preview-plain"
        items={items}
        onAction={setPlainAction}
      >
        <View testID="one-native-menu-preview-plain-trigger" style={styles.trigger}>
          <Text>Hold without preview</Text>
        </View>
      </One.iOS.ContextMenu>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 90,
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  trigger: {
    width: 220,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  preview: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#D8E8FF',
  },
})
