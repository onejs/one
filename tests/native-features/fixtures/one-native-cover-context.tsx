import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

type MenuItem = ComponentProps<typeof One.iOS.ContextMenu>['items'][number]

const contextItems: readonly MenuItem[] = [
  { type: 'action', id: 'copy', title: 'Copy', systemImage: 'doc.on.doc' },
  { type: 'divider', id: 'divider' },
  { type: 'toggle', id: 'pin', title: 'Pin', values: [false] },
  { type: 'action', id: 'delete', title: 'Delete', role: 'destructive' },
]

export default function OneNativeCoverContext() {
  const [category, setCategory] = useState<'Cover' | 'Context'>('Cover')
  const [coverPresented, setCoverPresented] = useState(false)
  const [coverChanges, setCoverChanges] = useState(0)
  const [contextAction, setContextAction] = useState('')
  const [pinned, setPinned] = useState(false)
  const handleCoverChange = (value: boolean) => {
    setCoverChanges((count) => count + 1)
    setCoverPresented(value)
  }

  return (
    <View style={styles.screen} testID="one-native-cover-context-screen">
      <View style={styles.row}>
        {(['Cover', 'Context'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            style={styles.action}
            testID={`one-native-system-category-${item.toLowerCase()}`}
            onPress={() => setCategory(item)}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        <Text style={styles.statusText}>{`Category: ${category}`}</Text>
        <Text style={styles.statusText}>{`Cover presented: ${coverPresented}`}</Text>
        <Text style={styles.statusText}>{`Cover changes: ${coverChanges}`}</Text>
        <Text style={styles.statusText}>{`Context action: ${contextAction}`}</Text>
        <Text style={styles.statusText}>{`Pinned: ${pinned}`}</Text>
      </View>

      {category === 'Cover' ? (
        <>
          <Pressable
            accessibilityRole="button"
            style={styles.action}
            testID="one-native-system-cover-open"
            onPress={() => handleCoverChange(true)}
          >
            <Text style={styles.actionText}>Open cover</Text>
          </Pressable>
          <One.iOS.FullScreenCover
            isPresented={coverPresented}
            testID="one-native-system-cover"
            onIsPresentedChange={handleCoverChange}
          >
            <View style={styles.coverContent} testID="one-native-system-cover-content">
              <Text style={styles.coverHeading}>Full Screen Cover</Text>
              <Pressable
                accessibilityRole="button"
                style={styles.action}
                testID="one-native-system-cover-close"
                onPress={() => handleCoverChange(false)}
              >
                <Text style={styles.actionText}>Close</Text>
              </Pressable>
            </View>
          </One.iOS.FullScreenCover>
        </>
      ) : (
        <One.iOS.ContextMenu
          items={contextItems.map((item) =>
            item.type === 'toggle' ? { ...item, values: [pinned] } : item
          )}
          testID="one-native-system-context"
          onAction={setContextAction}
          onValueChange={(id, value) => {
            if (id === 'pin') setPinned(value)
          }}
        >
          <View style={styles.trigger} testID="one-native-system-context-trigger">
            <Text style={styles.actionText}>Long press me</Text>
          </View>
        </One.iOS.ContextMenu>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 70, gap: 12, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 8 },
  action: {
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  actionText: { color: '#17233A', fontSize: 14, fontWeight: '600' },
  status: { padding: 8, borderRadius: 8, backgroundColor: '#F5F5F7' },
  statusText: { color: '#17233A', fontSize: 13 },
  trigger: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#E3E3E8' },
  coverContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  coverHeading: { color: '#17233A', fontSize: 18, fontWeight: '700' },
})
