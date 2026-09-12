import { useState, type ReactNode } from 'react'
import { Swift, type MenuItem } from 'one-native'
import { Platform, View, Text, Pressable, TextInput, StyleSheet } from 'react-native'

const FIRST = 'first'
const SECOND = 'second'
const iosVersion = Number.parseFloat(String(Platform.Version))

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
  const [searchRole, setSearchRole] = useState(false)
  const [toggleValues, setToggleValues] = useState<Record<string, boolean[]>>({
    checked: [true],
    mixed: [true, false],
  })

  const otherTab = selection === FIRST ? SECOND : FIRST
  const titles = { [FIRST]: 'First', [SECOND]: 'Second' }
  const images = { [FIRST]: '1.circle', [SECOND]: '2.circle' }
  const menuItems: MenuItem[] = [
    {
      type: 'action',
      id: 'copy',
      title: 'Copy',
      systemImage: 'doc.on.doc',
    },
    {
      type: 'toggle',
      id: 'checked',
      title: 'Checked',
      systemImage: 'checkmark.circle',
      values: toggleValues.checked,
      menuActionDismissBehavior: 'disabled',
    },
    {
      type: 'action',
      id: 'disabled',
      title: 'Disabled',
      systemImage: 'xmark.circle',
      disabled: true,
    },
    {
      type: 'action',
      id: 'keep-open',
      title: 'Keep Open',
      systemImage: 'pin',
      menuActionDismissBehavior: 'disabled',
    },
    {
      type: 'action',
      id: 'hidden',
      title: 'Hidden',
      systemImage: 'eye.slash',
      hidden: true,
    },
    {
      type: 'submenu',
      id: 'nested',
      title: 'More',
      systemImage: 'ellipsis.circle',
      children: [
        {
          type: 'action',
          id: 'nested-a',
          title: 'Nested A',
          systemImage: 'star',
        },
        {
          type: 'action',
          id: 'nested-b',
          title: 'Nested B',
          role: 'destructive',
        },
        {
          type: 'submenu',
          id: 'deeper',
          title: 'Deeper',
          children: [
            {
              type: 'action',
              id: 'deep-1',
              title: 'Deep 1',
            },
          ],
        },
      ],
    },
    {
      type: 'controlGroup',
      id: 'tools',
      title: 'Tools',
      controlGroupStyle: 'palette',
      children: [
        { type: 'action', id: 'bold', title: 'Bold', systemImage: 'bold' },
        { type: 'action', id: 'italic', title: 'Italic', systemImage: 'italic' },
      ],
    },
    {
      type: 'divider',
      id: 'divider',
    },
    {
      type: 'section',
      id: 'sources',
      title: 'Sources',
      children: [
        {
          type: 'toggle',
          id: 'mixed',
          title: 'Mixed',
          values: toggleValues.mixed,
        },
      ],
    },
  ]

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
        <Text style={styles.statusLabel}>
          Checked:{' '}
          <Text testID="one-native-checked">
            {toggleValues.checked[0] ? 'on' : 'off'}
          </Text>
          {'  '}Mixed:{' '}
          <Text testID="one-native-mixed">{toggleValues.mixed.join(',')}</Text>
          {'  '}Search:{' '}
          <Text testID="one-native-search-role">{searchRole ? 'on' : 'off'}</Text>
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
        <Pressable
          testID="one-native-toggle-search-role"
          style={styles.button}
          onPress={() => setSearchRole((value) => !value)}
        >
          <Text style={styles.buttonText}>
            {searchRole ? 'Clear search role' : 'Search role'}
          </Text>
        </Pressable>
      </View>

      <Swift.Tabs
        selection={selection}
        tabBarMinimizeBehavior={iosVersion >= 26 ? 'never' : undefined}
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
            role={id === SECOND && searchRole ? 'search' : undefined}
            testID={`one-native-tab-${id}`}
          >
            <TabPage id={id} title={titles[id]}>
              {id === FIRST ? (
                <Swift.Menu
                  accessibilityLabel="Open native menu"
                  menuOrder="fixed"
                  style={{
                    padding: toggleValues.checked[0] ? 12 : 24,
                    alignItems: 'center',
                  }}
                  items={menuItems}
                  onAction={(actionId) => setLastAction(actionId)}
                  onValueChange={(id, value, sourceIndex) => {
                    setToggleValues((current) => ({
                      ...current,
                      [id]: current[id].map((entry, index) =>
                        index === sourceIndex ? value : entry
                      ),
                    }))
                  }}
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
