import { useState } from 'react'
import { Swift, type TabViewStyle } from '@vxrn/native'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

// exercises every Swift.Tabs parity row in one screen: roles, sections with
// header actions, badges, the bottom accessory, tab bar visibility, styles,
// customization and minimize behavior.
const STYLES: TabViewStyle[] = ['automatic', 'sidebarAdaptable', 'tabBarOnly']

function Page({ id, title, controls }: { id: string; title: string; controls?: React.ReactNode }) {
  const [text, setText] = useState('')
  return (
    <ScrollView testID={`tabview-page-${id}`} contentContainerStyle={styles.page}>
      <Text style={styles.title}>{title}</Text>
      {controls}
      <TextInput
        testID={`tabview-input-${id}`}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={`${title} input`}
      />
      {Array.from({ length: 30 }, (_, index) => (
        <Text key={index} style={styles.row}>
          {title} row {index + 1}
        </Text>
      ))}
    </ScrollView>
  )
}

export default function OneNativeTabView() {
  const [selection, setSelection] = useState('build')
  const [tabViewStyle, setTabViewStyle] = useState<TabViewStyle>('sidebarAdaptable')
  const [tabBarHidden, setTabBarHidden] = useState(false)
  const [accessoryEnabled, setAccessoryEnabled] = useState(true)
  const [customization, setCustomization] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const log = (event: string) => setEvents((current) => [event, ...current].slice(0, 4))

  const controls = (
    <View style={styles.controls}>
      <Text testID="tabview-selection" style={styles.status}>
        selection {selection} · style {tabViewStyle}
      </Text>
      <Text testID="tabview-events" style={styles.status}>
        {events.join(' · ') || 'no events'}
      </Text>
      <Pressable
        testID="tabview-cycle-style"
        style={styles.button}
        onPress={() => setTabViewStyle(STYLES[(STYLES.indexOf(tabViewStyle) + 1) % STYLES.length])}
      >
        <Text style={styles.buttonText}>Next style</Text>
      </Pressable>
      <Pressable testID="tabview-toggle-bar" style={styles.button} onPress={() => setTabBarHidden((value) => !value)}>
        <Text style={styles.buttonText}>{tabBarHidden ? 'Show tab bar' : 'Hide tab bar'}</Text>
      </Pressable>
      <Pressable
        testID="tabview-toggle-accessory"
        style={styles.button}
        onPress={() => setAccessoryEnabled((value) => !value)}
      >
        <Text style={styles.buttonText}>{accessoryEnabled ? 'Disable accessory' : 'Enable accessory'}</Text>
      </Pressable>
      <Pressable testID="tabview-reset-customization" style={styles.button} onPress={() => setCustomization('')}>
        <Text style={styles.buttonText}>Reset customization</Text>
      </Pressable>
    </View>
  )

  return (
    <Swift.Tabs
      selection={selection}
      onSelectionChange={setSelection}
      tabViewStyle={tabViewStyle}
      tabBarVisibility={tabBarHidden ? 'hidden' : 'automatic'}
      customization={customization}
      onCustomizationChange={(value) => {
        setCustomization(value)
        log('customized')
      }}
      swiftStyle={{ tabBarMinimizeBehavior: 'onScrollDown' }}
    >
      <Swift.Tab id="build" title="Build" systemImage="hammer" badge={3} customizationID="build">
        <Page id="build" title="Build" controls={controls} />
      </Swift.Tab>
      <Swift.Tab id="design" title="Design" systemImage="paintbrush" customizationID="design">
        <Page id="design" title="Design" />
      </Swift.Tab>
      <Swift.Tab
        id="deploy"
        title="Deploy"
        systemImage="paperplane"
        badge="new"
        customizationID="deploy"
        customizationBehavior={{ behavior: 'disabled', for: ['sidebar'] }}
      >
        <Page id="deploy" title="Deploy" />
      </Swift.Tab>
      <Swift.TabSection
        id="library"
        title="Library"
        customizationID="library"
        defaultVisibility={{ visibility: 'hidden', for: ['tabBar'] }}
        sectionActions={[{ id: 'library-add', title: 'Add', systemImage: 'plus', onPress: () => log('section add') }]}
      >
        <Swift.Tab id="recent" title="Recent" systemImage="clock" customizationID="recent">
          <Page id="recent" title="Recent" />
        </Swift.Tab>
        <Swift.Tab id="starred" title="Starred" systemImage="star" customizationID="starred" disabled>
          <Page id="starred" title="Starred" />
        </Swift.Tab>
      </Swift.TabSection>
      <Swift.Tab id="search" title="Search" systemImage="magnifyingglass" role="search">
        <Page id="search" title="Search" />
      </Swift.Tab>
      <Swift.TabViewBottomAccessory isEnabled={accessoryEnabled}>
        <Pressable testID="tabview-accessory" style={styles.accessory} onPress={() => log('accessory')}>
          <Text style={styles.accessoryText}>Preview · {selection}</Text>
        </Pressable>
      </Swift.TabViewBottomAccessory>
    </Swift.Tabs>
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  controls: { gap: 8 },
  status: { fontSize: 13, color: '#666' },
  button: { backgroundColor: '#007aff', borderRadius: 10, padding: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 8, padding: 10 },
  row: { fontSize: 16, paddingVertical: 8 },
  accessory: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  accessoryText: { fontSize: 15, fontWeight: '600' },
})
