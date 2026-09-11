import { useState, type ReactNode } from 'react'
import { Swift } from 'one-native'
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native'

const FIRST = 'first'
const SECOND = 'second'

const menuItems = [
  {
    type: 'action' as const,
    id: 'copy',
    title: 'Copy',
    systemImage: 'doc.on.doc',
  },
  {
    type: 'action' as const,
    id: 'checked',
    title: 'Checked',
    systemImage: 'checkmark.circle',
    state: 'on' as const,
  },
  {
    type: 'action' as const,
    id: 'disabled',
    title: 'Disabled',
    systemImage: 'xmark.circle',
    disabled: true,
  },
  {
    type: 'action' as const,
    id: 'keep-open',
    title: 'Keep Open',
    systemImage: 'pin',
    keepsMenuPresented: true,
  },
  {
    type: 'action' as const,
    id: 'hidden',
    title: 'Hidden',
    systemImage: 'eye.slash',
    hidden: true,
  },
  {
    type: 'submenu' as const,
    id: 'nested',
    title: 'More',
    systemImage: 'ellipsis.circle',
    children: [
      {
        type: 'action' as const,
        id: 'nested-a',
        title: 'Nested A',
        systemImage: 'star',
      },
      {
        type: 'action' as const,
        id: 'nested-b',
        title: 'Nested B',
        destructive: true,
      },
      {
        type: 'submenu' as const,
        id: 'deeper',
        title: 'Deeper',
        children: [
          {
            type: 'action' as const,
            id: 'deep-1',
            title: 'Deep 1',
          },
        ],
      },
    ],
  },
  {
    type: 'submenu' as const,
    id: 'inline-group',
    title: 'Inline',
    displayInline: true,
    singleSelection: true,
    children: [
      {
        type: 'action' as const,
        id: 'inline-off',
        title: 'Off',
        state: 'off' as const,
      },
      {
        type: 'action' as const,
        id: 'inline-on',
        title: 'On',
        state: 'on' as const,
      },
      {
        type: 'action' as const,
        id: 'inline-mixed',
        title: 'Mixed',
        state: 'mixed' as const,
      },
    ],
  },
]

function TabPage({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children?: ReactNode
}) {
  const [counter, setCounter] = useState(0)
  const [input, setInput] = useState('')

  return (
    <View testID={`one-native-panel-${id}`} style={styles.panel}>
      <Text style={styles.panelTitle}>{title} tab</Text>
      <Text testID={`one-native-counter-${id}`} style={styles.counter}>
        {counter}
      </Text>
      <Pressable
        testID={`one-native-increment-${id}`}
        style={styles.button}
        onPress={() => setCounter((value) => value + 1)}
      >
        <Text style={styles.buttonText}>Increment</Text>
      </Pressable>
      <TextInput
        testID={`one-native-input-${id}`}
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder={`${title} input`}
      />
      {children}
    </View>
  )
}

export default function OneNativeScreen() {
  const [selection, setSelection] = useState(FIRST)
  const [observedSelection, setObservedSelection] = useState(FIRST)
  const [ignoreSelectionChange, setIgnoreSelectionChange] = useState(false)
  const [lastAction, setLastAction] = useState('none')
  const [tabOrder, setTabOrder] = useState([FIRST, SECOND])

  const otherTab = selection === FIRST ? SECOND : FIRST
  const titles = { [FIRST]: 'First', [SECOND]: 'Second' }
  const images = { [FIRST]: '1.circle', [SECOND]: '2.circle' }

  return (
    <View style={styles.container} testID="one-native-screen">
      <Text testID="one-native-title" style={styles.title}>
        One Native
      </Text>

      <View testID="one-native-status" style={styles.statusCard}>
        <Text style={styles.statusLabel}>
          Selected: <Text testID="one-native-selection">{selection}</Text>
          {'  '}Requested:{' '}
          <Text testID="one-native-observed-selection">{observedSelection}</Text>
        </Text>
        <Text style={styles.statusLabel}>
          Menu action: <Text testID="one-native-last-action">{lastAction}</Text>
          {'  '}Reject taps:{' '}
          <Text testID="one-native-ignore-selection">
            {ignoreSelectionChange ? 'on' : 'off'}
          </Text>
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          testID="one-native-select-external"
          style={styles.button}
          onPress={() => setSelection(otherTab)}
        >
          <Text style={styles.buttonText}>Select {titles[otherTab]}</Text>
        </Pressable>
        <Pressable
          testID="one-native-reorder"
          style={styles.button}
          onPress={() => setTabOrder((order) => [...order].reverse())}
        >
          <Text style={styles.buttonText}>Reorder</Text>
        </Pressable>
        <Pressable
          testID="one-native-toggle-ignore-selection"
          style={styles.button}
          onPress={() => setIgnoreSelectionChange((value) => !value)}
        >
          <Text style={styles.buttonText}>
            {ignoreSelectionChange ? 'Accept selection' : 'Reject selection'}
          </Text>
        </Pressable>
      </View>

      <Swift.Tabs
        selection={selection}
        onSelectionChange={(id) => {
          setObservedSelection(id)
          if (!ignoreSelectionChange) {
            setSelection(id)
          }
        }}
      >
        {tabOrder.map((id) => (
          <Swift.Tab
            key={id}
            id={id}
            title={titles[id]}
            systemImage={images[id]}
            badge={id === FIRST ? '2' : undefined}
            testID={`one-native-tab-${id}`}
          >
            <TabPage id={id} title={titles[id]}>
              {id === FIRST ? (
                <Swift.Menu
                  accessibilityLabel="Open native menu"
                  items={menuItems}
                  onAction={(actionId) => setLastAction(actionId)}
                >
                  <View testID="one-native-menu-trigger" style={styles.menuTrigger}>
                    <Text style={styles.buttonText}>Open Menu</Text>
                  </View>
                </Swift.Menu>
              ) : null}
            </TabPage>
          </Swift.Tab>
        ))}
      </Swift.Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  panel: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  counter: {
    fontSize: 28,
    fontWeight: '700',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  menuTrigger: {
    height: 44,
    width: 180,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
