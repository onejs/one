import { useState } from 'react'
import { Swift, type MenuItem } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const categories = ['Share', 'Photos', 'Web', 'Empty', 'Cover', 'Context'] as const

type Category = (typeof categories)[number]

// WebView renders markup rather than a url so the fixture never depends on the simulator's
// network. two documents with different titles make a reload observable through onTitleChange.
const documents = [
  '<!doctype html><meta name="viewport" content="width=device-width"><title>One Native A</title>' +
    '<body style="margin:0;font:14px -apple-system"><h1 id="heading">Document A</h1>' +
    '<p>rendered from markup</p></body>',
  '<!doctype html><meta name="viewport" content="width=device-width"><title>One Native B</title>' +
    '<body style="margin:0;font:14px -apple-system"><h1 id="heading">Document B</h1>' +
    '<p>second document</p></body>',
]

const emptyActions = [
  { id: 'retry', label: 'Retry' },
  { id: 'dismiss', label: 'Dismiss', role: 'cancel' as const },
]

const contextItems: readonly MenuItem[] = [
  { type: 'action', id: 'copy', title: 'Copy', systemImage: 'doc.on.doc' },
  { type: 'divider', id: 'divider' },
  { type: 'toggle', id: 'pin', title: 'Pin', values: [false] },
  { type: 'action', id: 'delete', title: 'Delete', role: 'destructive' },
]

export default function OneNativeSystem() {
  const [category, setCategory] = useState<Category>('Share')
  const [shareAsUrl, setShareAsUrl] = useState(false)
  const [multiSelect, setMultiSelect] = useState(false)
  // each picked item is copied out on its own task, so the events can arrive in any order.
  // counting arrivals and recording the batch size the events carry keeps both observable.
  const [picked, setPicked] = useState({ received: 0, expected: 0, last: '' })
  const [pickError, setPickError] = useState('')
  const [documentIndex, setDocumentIndex] = useState(0)
  const [web, setWeb] = useState({
    title: '',
    loading: false,
    progress: 0,
    navigations: 0,
  })
  const [emptyAction, setEmptyAction] = useState('')
  const [coverPresented, setCoverPresented] = useState(false)
  const [coverChanges, setCoverChanges] = useState(0)
  const [contextAction, setContextAction] = useState('')
  const [pinned, setPinned] = useState(false)

  const handleCoverChange = (value: boolean) => {
    setCoverChanges((count) => count + 1)
    setCoverPresented(value)
  }

  const status: [string, string | number][] = [
    ['Category', category],
    ['Share type', shareAsUrl ? 'url' : 'text'],
    ['Picked', `${picked.received}/${picked.expected}`],
    ['Pick last', picked.last],
    ['Pick error', pickError],
    ['Document', documentIndex],
    ['Web title', web.title],
    ['Web loading', String(web.loading)],
    ['Web progress', Math.round(web.progress * 100)],
    ['Web navigations', web.navigations],
    ['Empty action', emptyAction],
    ['Cover presented', String(coverPresented)],
    ['Cover changes', coverChanges],
    ['Context action', contextAction],
    ['Pinned', String(pinned)],
  ]

  return (
    <View style={styles.screen} testID="one-native-system-screen">
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            key={item}
            style={[styles.action, category === item && styles.selected]}
            testID={`one-native-system-category-${item.toLowerCase()}`}
            onPress={() => setCategory(item)}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-system-${label.toLowerCase().replace(' ', '-')}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>

      {category === 'Share' ? (
        <View style={styles.surface}>
          <Pressable
            accessibilityRole="button"
            style={styles.action}
            testID="one-native-system-share-type"
            onPress={() => setShareAsUrl((value) => !value)}
          >
            <Text style={styles.actionText}>Toggle share type</Text>
          </Pressable>
          <Swift.ShareLink
            item={shareAsUrl ? 'https://onestack.dev' : 'shared from one-native'}
            itemType={shareAsUrl ? 'url' : 'text'}
            label="Share"
            message="sent by the one-native fixture"
            style={styles.swiftButton}
            subject="One Native"
            systemImage="square.and.arrow.up"
            testID="one-native-system-share"
          />
        </View>
      ) : null}

      {category === 'Photos' ? (
        <View style={styles.surface}>
          <Pressable
            accessibilityRole="button"
            style={styles.action}
            testID="one-native-system-photos-selection"
            onPress={() => setMultiSelect((value) => !value)}
          >
            <Text style={styles.actionText}>
              {multiSelect ? 'Select up to 3' : 'Select one'}
            </Text>
          </Pressable>
          <Swift.PhotosPicker
            filter="images"
            label="Choose photos"
            maxSelectionCount={multiSelect ? 3 : 1}
            selectionBehavior="ordered"
            style={styles.swiftButton}
            systemImage="photo.on.rectangle"
            testID="one-native-system-photos"
            onPick={(url, _index, count) => {
              setPicked((value) => ({
                received: value.received + 1,
                expected: count,
                last: url,
              }))
            }}
            onPickError={setPickError}
          />
        </View>
      ) : null}

      {category === 'Web' ? (
        <>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-system-web-document"
              onPress={() => setDocumentIndex((value) => (value === 0 ? 1 : 0))}
            >
              <Text style={styles.actionText}>Swap document</Text>
            </Pressable>
          </View>
          <Swift.WebView
            html={documents[documentIndex]}
            style={styles.web}
            testID="one-native-system-web"
            onLoadingChange={(loading, progress) =>
              setWeb((value) => ({ ...value, loading, progress }))
            }
            onNavigate={() =>
              setWeb((value) => ({ ...value, navigations: value.navigations + 1 }))
            }
            onTitleChange={(title) => setWeb((value) => ({ ...value, title }))}
          />
        </>
      ) : null}

      {category === 'Empty' ? (
        <Swift.ContentUnavailableView
          actions={emptyActions}
          description="Nothing has been indexed yet, so there is nothing to show."
          style={styles.empty}
          systemImage="tray"
          testID="one-native-system-empty"
          title="No Results"
          onAction={setEmptyAction}
        />
      ) : null}

      {category === 'Cover' ? (
        <View style={styles.surface}>
          <Pressable
            accessibilityRole="button"
            style={styles.action}
            testID="one-native-system-cover-open"
            onPress={() => handleCoverChange(true)}
          >
            <Text style={styles.actionText}>Open cover</Text>
          </Pressable>
          <Swift.FullScreenCover
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
          </Swift.FullScreenCover>
        </View>
      ) : null}

      {category === 'Context' ? (
        <View style={styles.surface}>
          <Swift.ContextMenu
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
              <Text style={styles.triggerText}>Long press me</Text>
            </View>
          </Swift.ContextMenu>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  surface: { marginTop: 8, alignItems: 'flex-start', gap: 8 },
  swiftButton: { width: 160 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  selected: { backgroundColor: '#B7D5FF' },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  // WebView and ContentUnavailableView are fill controls: neither reports an ideal size, so
  // both take the box Yoga gives them rather than measuring themselves.
  web: { marginTop: 8, height: 260 },
  empty: { marginTop: 8, height: 260 },
  trigger: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  triggerText: { color: '#17233A', fontSize: 13, fontWeight: '600' },
  coverContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  coverHeading: { color: '#17233A', fontSize: 18, fontWeight: '700' },
})
