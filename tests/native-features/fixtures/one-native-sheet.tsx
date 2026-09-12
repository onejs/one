import { useState } from 'react'
import { Swift, type PresentationDetent } from 'one-native'
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'

export type DetentProfileKey = 'medium+large' | 'fraction.4' | 'height300'

const detentProfiles: Record<DetentProfileKey, readonly PresentationDetent[]> = {
  'medium+large': ['medium', 'large'],
  'fraction.4': [{ fraction: 0.4 }],
  height300: [{ height: 300 }],
}

const detentKeys: readonly DetentProfileKey[] = [
  'medium+large',
  'fraction.4',
  'height300',
]

interface SheetContentProps {
  onClose: () => void
  onReportLayout: (width: number, height: number) => void
  detentProfile: DetentProfileKey
  onCycleDetents: () => void
  isParentPresented: boolean
}

function SheetContent({
  onClose,
  onReportLayout,
  detentProfile,
  onCycleDetents,
  isParentPresented,
}: SheetContentProps) {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('')
  const [nestedPresented, setNestedPresented] = useState(false)

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    onReportLayout(Math.round(width), Math.round(height))
  }

  return (
    <View onLayout={handleLayout} style={styles.sheetContent}>
      <Text style={styles.sheetHeading}>Sheet Content</Text>

      {/* counter and increment (kept compact for height300) */}
      <View style={styles.compactRow}>
        <Text style={styles.sheetLabel}>Counter:</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCount((c) => c + 1)}
          style={styles.counterButton}
          testID="one-native-sheet-counter"
        >
          <Text style={styles.counterText}>{count}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCount((c) => c + 1)}
          style={styles.smallActionButton}
          testID="one-native-sheet-increment"
        >
          <Text style={styles.smallActionText}>+1</Text>
        </Pressable>
      </View>

      {/* textInput with local state surviving dismiss/reopen */}
      <TextInput
        accessibilityLabel="Sheet text input"
        onChangeText={setText}
        placeholder="Type sheet note"
        placeholderTextColor="#8E8E93"
        style={styles.input}
        testID="one-native-sheet-input"
        value={text}
      />

      {/* actions row: Close, detent switch, nested sheet */}
      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.actionButton, styles.closeButton]}
          testID="one-native-sheet-close"
        >
          <Text style={styles.actionButtonText}>Close sheet</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onCycleDetents}
          style={styles.actionButton}
          testID={
            isParentPresented
              ? 'one-native-sheet-detents'
              : 'one-native-sheet-detents-sheet'
          }
        >
          <Text style={styles.actionButtonText}>Detents: {detentProfile}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setNestedPresented(true)}
          style={styles.actionButton}
          testID="one-native-sheet-nested-open"
        >
          <Text style={styles.actionButtonText}>Open nested</Text>
        </Pressable>
      </View>

      {/* nested sheet */}
      <Swift.Sheet isPresented={nestedPresented} onIsPresentedChange={setNestedPresented}>
        <View style={styles.nestedContent}>
          <Text style={styles.nestedText} testID="one-native-sheet-nested-content">
            Nested Sheet Content
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setNestedPresented(false)}
            style={[styles.actionButton, styles.closeButton, { flex: 0, minHeight: 44 }]}
            testID="one-native-sheet-nested-close"
          >
            <Text style={styles.actionButtonText}>Close nested</Text>
          </Pressable>
        </View>
      </Swift.Sheet>
    </View>
  )
}

export default function OneNativeSheet() {
  const [isPresented, setIsPresented] = useState(false)
  const [dismissCount, setDismissCount] = useState(0)
  const [detentProfile, setDetentProfile] = useState<DetentProfileKey>('medium+large')
  const [interactiveDismissDisabled, setInteractiveDismissDisabled] = useState(false)
  const [contentLayout, setContentLayout] = useState({ width: 0, height: 0 })

  const cycleDetents = () => {
    setDetentProfile((current) => {
      const idx = detentKeys.indexOf(current)
      return detentKeys[(idx + 1) % detentKeys.length]
    })
  }

  const handleReportLayout = (width: number, height: number) => {
    setContentLayout({ width, height })
  }

  return (
    <View style={styles.screen} testID="one-native-sheet-screen">
      <Text style={styles.title}>One Native Sheet</Text>

      {/* visible presentation status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusValue} testID="one-native-sheet-status">
            {isPresented ? 'open' : 'closed'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Dismiss count:</Text>
          <Text style={styles.statusValue} testID="one-native-sheet-dismiss-count">
            {dismissCount}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Layout:</Text>
          <Text style={styles.statusValue} testID="one-native-sheet-layout">
            {`${contentLayout.width}x${contentLayout.height}`}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Detents:</Text>
          <Pressable
            accessibilityRole="button"
            onPress={cycleDetents}
            style={styles.detentBadge}
            testID={
              !isPresented
                ? 'one-native-sheet-detents'
                : 'one-native-sheet-detents-parent'
            }
          >
            <Text style={styles.detentBadgeText}>{detentProfile}</Text>
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Block dismiss:</Text>
          <Switch
            accessibilityLabel="Block interactive dismiss"
            onValueChange={setInteractiveDismissDisabled}
            testID="one-native-sheet-block-dismiss"
            value={interactiveDismissDisabled}
          />
        </View>
      </View>

      {/* detents selection buttons while closed */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Detent Profiles (while closed):</Text>
        <View style={styles.buttonRow}>
          {detentKeys.map((key) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: detentProfile === key }}
              key={key}
              onPress={() => setDetentProfile(key)}
              style={[
                styles.profileButton,
                detentProfile === key && styles.selectedProfileButton,
              ]}
              testID={`one-native-sheet-detents-${key.replace('+', '-').replace('.', '')}`}
            >
              <Text
                style={[
                  styles.profileButtonText,
                  detentProfile === key && styles.selectedProfileButtonText,
                ]}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* external Open sheet button */}
      <View style={styles.openButtonContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsPresented(true)}
          style={styles.openButton}
          testID="one-native-sheet-open"
        >
          <Text style={styles.openButtonText}>Open sheet</Text>
        </Pressable>
      </View>

      {/* swift.Sheet with eager-mounted SheetContent child outside isPresented conditional */}
      <Swift.Sheet
        interactiveDismissDisabled={interactiveDismissDisabled}
        isPresented={isPresented}
        onDismiss={() => setDismissCount((c) => c + 1)}
        onIsPresentedChange={setIsPresented}
        presentationDetents={detentProfiles[detentProfile]}
      >
        <SheetContent
          detentProfile={detentProfile}
          isParentPresented={isPresented}
          onClose={() => setIsPresented(false)}
          onCycleDetents={cycleDetents}
          onReportLayout={handleReportLayout}
        />
      </Swift.Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  detentBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detentBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  section: {
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileButton: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedProfileButton: {
    backgroundColor: '#007AFF',
  },
  profileButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  selectedProfileButtonText: {
    color: '#FFFFFF',
  },
  openButtonContainer: {
    marginTop: 20,
  },
  openButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetContent: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  sheetHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3A3A3C',
  },
  counterButton: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
  },
  smallActionButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  input: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    backgroundColor: '#F9F9FB',
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1C1C1E',
  },
  actionButton: {
    flex: 1,
    minHeight: 34,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closeButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nestedContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  nestedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
})
