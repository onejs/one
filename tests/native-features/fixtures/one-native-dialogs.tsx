import { useState } from 'react'
import { Swift, type DialogAction } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const categories = ['Alert', 'Confirmation'] as const
const titleVisibilities = ['automatic', 'visible', 'hidden'] as const
const alertActions: readonly DialogAction[] = [
  { id: 'cancel', label: 'Cancel alert', role: 'cancel' },
  { id: 'confirm', label: 'Confirm alert', role: 'confirm' },
  { id: 'reset', label: 'Reset alert revision', role: 'close' },
]
const confirmationActions: readonly DialogAction[] = [
  { id: 'cancel', label: 'Cancel confirmation', role: 'cancel' },
  { id: 'confirm', label: 'Confirm confirmation', role: 'confirm' },
]

export default function OneNativeDialogs() {
  const [category, setCategory] = useState<(typeof categories)[number]>('Alert')
  const [isPresented, setIsPresented] = useState(false)
  const [changes, setChanges] = useState(0)
  const [actions, setActions] = useState(0)
  const [last, setLast] = useState('none')
  const [rejectClose, setRejectClose] = useState(false)
  const [revision, setRevision] = useState(0)
  const [titleVisibilityIndex, setTitleVisibilityIndex] = useState(0)
  const titleVisibility =
    titleVisibilities[titleVisibilityIndex % titleVisibilities.length]

  const handlePresentationChange = (value: boolean) => {
    setChanges((count) => count + 1)
    // refusing the native dismissal must roll the native state back and re-present.
    if (!(rejectClose && !value)) setIsPresented(value)
  }
  const handleAction = (id: string) => {
    setActions((count) => count + 1)
    setLast(id)
    if (id === 'reset') {
      setRejectClose(false)
      setIsPresented(false)
      setRevision((current) => current + 1)
    }
  }
  const status: [string, string | number][] = [
    ['Category', category],
    ['Presented', String(isPresented)],
    ['Changes', changes],
    ['Actions', actions],
    ['Last', last],
    ['Reject', rejectClose ? 'on' : 'off'],
    ['Revision', revision],
    ...(category === 'Confirmation'
      ? [['Title visibility', titleVisibility] as [string, string]]
      : []),
  ]

  return (
    <View style={styles.screen} testID="one-native-dialogs-screen">
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            key={item}
            style={[styles.action, category === item && styles.selected]}
            testID={`one-native-dialog-category-${item.toLowerCase()}`}
            onPress={() => {
              setCategory(item)
              setIsPresented(false)
              setChanges(0)
              setActions(0)
              setLast('none')
              setRejectClose(false)
              setRevision(0)
              setTitleVisibilityIndex(0)
            }}
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
            testID={`one-native-dialog-${label.toLowerCase().replace(' ', '-')}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-dialog-open"
          onPress={() => handlePresentationChange(true)}
        >
          <Text style={styles.actionText}>Open dialog</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.action}
          testID="one-native-dialog-reject"
          onPress={() => setRejectClose((value) => !value)}
        >
          <Text style={styles.actionText}>Reject closes</Text>
        </Pressable>
        {category === 'Confirmation' ? (
          <Pressable
            accessibilityRole="button"
            style={styles.action}
            testID="one-native-dialog-title-visibility"
            onPress={() => setTitleVisibilityIndex((value) => value + 1)}
          >
            <Text style={styles.actionText}>Change title visibility</Text>
          </Pressable>
        ) : null}
      </View>
      {category === 'Alert' ? (
        <Swift.Alert
          actions={alertActions}
          isPresented={isPresented}
          message="Alert actions report their ids separately from dismissal."
          revision={revision}
          title="One Native Alert"
          onAction={handleAction}
          onIsPresentedChange={handlePresentationChange}
        />
      ) : (
        <Swift.ConfirmationDialog
          actions={confirmationActions}
          isPresented={isPresented}
          message="Confirmation actions report their ids separately from dismissal."
          revision={revision}
          title="One Native Confirmation"
          // iOS anchors the popover adaptation to the host's own position in RN layout.
          style={{ top: 250, left: 40 }}
          titleVisibility={titleVisibility}
          onAction={handleAction}
          onIsPresentedChange={handlePresentationChange}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
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
})
