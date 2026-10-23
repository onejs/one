import { memo, useEffect, useRef, useState } from 'react'
import {
  Animated,
  DevSettings,
  Image,
  PlatformColor,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native'
import { One } from 'one'
import { probe } from '../probe/resolution'
import { Gradients } from '../probe/Gradients'

const swatch =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAASUlEQVR4nO3QMQ0AMAgAMOTsRh1id8/GkEFCetRA42b+SafeqBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQL2BzRVihEezZkGnAAAAABJRU5ErkJggg=='

function Button(props: { id: string; label: string; cursor?: 'pointer' | 'auto' }) {
  const [count, setCount] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <Pressable
      testID={props.id}
      accessibilityLabel={`${props.label} button`}
      accessibilityRole="button"
      onPress={() => setCount((value) => value + 1)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        cursor: props.cursor ?? 'pointer',
        padding: 10,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: focused ? '#0a84ff' : 'transparent',
        backgroundColor: pressed ? '#1f5fbf' : hovered ? '#4d8de0' : '#2f6fd0',
      })}
    >
      <Text style={{ color: 'white' }} testID={`${props.id}-text`}>
        {`${props.label} presses ${count} hover ${hovered ? 'yes' : 'no'} focus ${focused ? 'yes' : 'no'}`}
      </Text>
    </Pressable>
  )
}

const AnimatedProbe = memo(function AnimatedProbe() {
  const progress = useRef(new Animated.Value(0)).current
  const animation = useRef<Animated.CompositeAnimation | null>(null)
  const [status, setStatus] = useState('idle')
  const renders = useRef(0)
  renders.current++
  useEffect(() => () => animation.current?.stop(), [])
  return (
    <View>
      <Pressable
        testID="animate"
        accessibilityRole="button"
        accessibilityLabel="Animate native view"
        onPress={() => {
          animation.current?.stop()
          progress.setValue(0)
          animation.current = Animated.timing(progress, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
          animation.current.start(({ finished }) =>
            setStatus(finished ? 'finished' : 'cancelled')
          )
        }}
      >
        <Text>{`Animate native view: ${status}`}</Text>
      </Pressable>
      <Animated.View
        testID="animated-probe"
        style={{
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 120],
              }),
            },
          ],
          backgroundColor: '#2f6fd0',
          width: 200,
          height: 24,
        }}
      >
        <Text>{`native animated renders ${renders.current}`}</Text>
      </Animated.View>
    </View>
  )
})

function NativeControls() {
  const [presses, setPresses] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [reject, setReject] = useState(false)
  const [changes, setChanges] = useState(0)
  const [revision, setRevision] = useState(0)
  return (
    <View testID="native-controls" style={{ gap: 6, marginVertical: 8 }}>
      <Text>AppKit controls</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button testID="native-disable" title={disabled ? 'Enable controls' : 'Disable controls'} onPress={() => setDisabled(!disabled)} />
        <One.macOS.Button testID="native-mount" title={mounted ? 'Unmount controls' : 'Mount controls'} onPress={() => setMounted(!mounted)} />
        <One.macOS.Button testID="native-set" title="Select Flags" onPress={() => { setSelectedIndex(2); setRevision(revision + 1) }} />
        <One.macOS.Button testID="native-reject" title={reject ? 'Accept selection' : 'Reject selection'} onPress={() => setReject(!reject)} />
      </View>
      {mounted && <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button testID="native-action" title="New pane" systemImage="plus" disabled={disabled} onPress={() => setPresses(presses + 1)} />
        <One.macOS.SegmentedControl
          testID="native-filter"
          accessibilityLabel="Feed filter"
          labels={['All', 'Shares', 'Flags', 'Asks']}
          selectedIndex={selectedIndex}
          revision={revision}
          disabled={disabled}
          onChange={(event) => { setChanges(value => value + 1); if (!reject) setSelectedIndex(event.selectedIndex) }}
        />
      </View>}
      <Text testID="native-result">{`presses ${presses} selection ${selectedIndex} changes ${changes} disabled ${disabled} mounted ${mounted} reject ${reject} revision ${revision}`}</Text>
    </View>
  )
}

// each window runs its own runtime; the tag shows whose config the menu bar has
const rootTag = Math.random().toString(36).slice(2, 6)

const fixtureCommands = {
  bindings: [
    { id: 'fixture.ping', key: 'cmd-shift-[' },
    { id: 'fixture.tab', key: 'ctrl-tab' },
    { id: 'fixture.tab', key: 'ctrl-shift-tab' },
    { id: 'fixture.tab', key: 'tab', context: '!Input && !Terminal' },
    { id: 'fixture.tab', key: 'shift-tab', context: '!Input && !Terminal' },
    { id: 'fixture.count', key: 'cmd-alt-k' },
    { id: 'fixture.arrow', key: 'up', context: '!Input && !Terminal' },
    { id: 'fixture.hidden', key: 'cmd-shift-9' },
  ],
  menus: [
    { label: 'App', items: [{ kind: 'action' as const, id: 'fixture.ping', label: 'Ping' }] },
    {
      label: 'Fixture',
      items: [
        { kind: 'action' as const, id: 'fixture.count', label: 'Count' },
        { kind: 'action' as const, id: 'fixture.root', label: `Root ${rootTag}` },
        { kind: 'separator' as const },
        { kind: 'submenu' as const, label: 'More', items: [{ kind: 'action' as const, id: 'fixture.arrow', label: 'Arrow' }] },
      ],
    },
    { label: 'View', items: [{ kind: 'action' as const, id: 'fixture.view', label: 'Fixture View' }] },
  ],
}

// native menu and key commands reach this runtime's listeners once each
function AppCommandsProbe() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [listening, setListening] = useState(true)
  const [error, setError] = useState('none')
  useEffect(() => {
    One.macOS.AppCommands.configure(fixtureCommands)
  }, [])
  useEffect(() => {
    if (!listening) return
    const remove = One.macOS.AppCommands.addListener((id) => setCounts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 })))
    return () => {
      remove()
      remove()
    }
  }, [listening])
  const configureInvalid = () => {
    try {
      One.macOS.AppCommands.configure({ bindings: [{ id: 'fixture.bad', key: 'cmd-k cmd-s' }], menus: [] })
      setError('accepted')
    } catch (caught) {
      setError(String((caught as Error).message))
    }
  }
  const summary = ['fixture.ping', 'fixture.count', 'fixture.arrow', 'fixture.hidden', 'fixture.view', 'fixture.tab', 'fixture.root']
    .map((id) => `${id.slice(8)} ${counts[id] ?? 0}`)
    .join(' ')
  return (
    <View testID="app-commands" style={{ gap: 6, marginVertical: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button testID="app-commands-listen" title={listening ? 'Remove listener' : 'Add listener'} onPress={() => setListening(!listening)} />
        <One.macOS.Button testID="app-commands-invalid" title="Configure invalid" onPress={configureInvalid} />
      </View>
      <Text testID="app-commands-result">{`root ${rootTag} ${summary} listening ${listening}`}</Text>
      <Text testID="app-commands-error">{`error ${error}`}</Text>
    </View>
  )
}

// same font at different line heights must share a centered row's baseline
function LineHeights() {
  return (
    <View testID="line-heights" style={{ gap: 4, marginVertical: 4 }}>
      <View testID="line-height-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 28, backgroundColor: '#e8e8e8' }}>
        <Text style={{ fontSize: 13 }}>Hg natural</Text>
        <Text style={{ fontSize: 13, lineHeight: 16 }}>Hg 16</Text>
        <Text style={{ fontSize: 13, lineHeight: 20 }}>Hg 20</Text>
        <Text style={{ fontSize: 13, lineHeight: 28 }}>Hg 28</Text>
      </View>
      <Text testID="line-height-multiline" style={{ fontSize: 13, lineHeight: 20, width: 220, backgroundColor: '#e8e8e8' }}>
        Hg multiline text at line height twenty wraps onto three lines here
      </Text>
    </View>
  )
}

// renders once; appearance changes must repaint these colors natively
let platformColorRenders = 0

const PlatformColors = memo(function PlatformColors() {
  platformColorRenders++
  const swatch = { width: 44, height: 22, borderRadius: 4 }
  return (
    <View testID="platform-colors" style={{ gap: 4, padding: 8, marginVertical: 4, backgroundColor: PlatformColor('windowBackgroundColor') }}>
      <Text testID="platform-label" style={{ color: PlatformColor('labelColor') }}>{`Label renders ${platformColorRenders}`}</Text>
      <Text style={{ color: PlatformColor('secondaryLabelColor') }}>Secondary label</Text>
      <Text style={{ color: PlatformColor('controlAccentColor') }}>Accent text</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View testID="swatch-accent" style={[swatch, { backgroundColor: PlatformColor('controlAccentColor') }]} />
        <View testID="swatch-fill" style={[swatch, { backgroundColor: PlatformColor('systemFill') }]} />
        <View testID="swatch-control" style={[swatch, { backgroundColor: PlatformColor('controlBackgroundColor'), borderWidth: 1, borderColor: PlatformColor('separatorColor') }]} />
        <View testID="swatch-rgb" style={[swatch, { backgroundColor: '#3366cc' }]} />
        <View testID="swatch-fallback" style={[swatch, { backgroundColor: PlatformColor('notAColor', { fallback: '#ff8800' }) }]} />
      </View>
      <Text style={{ color: 'rgb(200, 40, 40)' }}>Ordinary red</Text>
    </View>
  )
})

export default function Index() {
  const [isOn, setIsOn] = useState(false)
  const [showAnimation, setShowAnimation] = useState(true)
  const scheme = useColorScheme()
  const { width, height } = useWindowDimensions()
  const [offset, setOffset] = useState(0)
  const [imageState, setImageState] = useState('loading')
  const [name, setName] = useState('')
  const [shout, setShout] = useState('')
  const [notes, setNotes] = useState('')
  const [inputEvents, setInputEvents] = useState('events')
  const log = (event: string) => setInputEvents((events) => `${events} ${event}`.trim())
  const rowRef = useRef<View>(null)
  const [rowY, setRowY] = useState('row y -')
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#f5f5f5' }}>
      <Text testID="macos-label">macOS</Text>
      <Text testID="macos-probe">{probe}</Text>
      <Gradients />
      <NativeControls />
      <AppCommandsProbe />
      <PlatformColors />
      <LineHeights />
      <Pressable
        testID="toggle-animation"
        accessibilityRole="button"
        onPress={() => setShowAnimation((visible) => !visible)}
      >
        <Text>{showAnimation ? 'Unmount animation' : 'Mount animation'}</Text>
      </Pressable>
      <Pressable
        testID="reload-host"
        accessibilityRole="button"
        onPress={() => DevSettings.reload()}
      >
        <Text>Reload host</Text>
      </Pressable>
      {showAnimation && <AnimatedProbe />}
      <Text testID="macos-env">{`scheme ${scheme} window ${Math.round(width)}x${Math.round(height)}`}</Text>
      <View style={{ marginTop: 12 }}>
        <Button id="first" label="First" />
        <Button id="second" label="Second" cursor="auto" />
      </View>
      <One.macOS.Toggle
        label="Enabled"
        isOn={isOn}
        revision={0}
        onIsOnChange={(event) => setIsOn(event.isOn)}
      />
      <Text testID="macos-toggle">{isOn ? 'on' : 'off'}</Text>
      <Text testID="macos-scroll-offset">{`scroll ${Math.round(offset)}`}</Text>
      <ScrollView
        testID="macos-scroll"
        style={{ height: 90, borderWidth: 1, borderColor: '#888' }}
        scrollEventThrottle={16}
        onScroll={(event) => {
          setOffset(event.nativeEvent.contentOffset.y)
          setTimeout(
            () =>
              rowRef.current?.measureInWindow((_x, y) =>
                setRowY(`row y ${Math.round(y)}`)
              ),
            400
          )
        }}
      >
        {Array.from({ length: 30 }, (_, index) => (
          <View key={index} ref={index === 0 ? rowRef : undefined}>
            <Text style={{ padding: 4 }}>{`row ${index}`}</Text>
          </View>
        ))}
      </ScrollView>
      <Text testID="macos-row-y">{rowY}</Text>
      <ScrollView
        testID="macos-scroll-initial"
        style={{ height: 50, borderWidth: 1, borderColor: '#888' }}
        contentOffset={{ x: 0, y: 60 }}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <Text key={index} style={{ padding: 4 }}>{`initial row ${index}`}</Text>
        ))}
      </ScrollView>
      <Text testID="macos-image-state">{`image ${imageState}`}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Image
          testID="macos-image"
          source={{ uri: swatch }}
          style={{ width: 96, height: 48, borderRadius: 8 }}
          resizeMode="stretch"
          onLoad={(event) =>
            setImageState(
              `loaded ${event.nativeEvent.source.width}x${event.nativeEvent.source.height}`
            )
          }
          onError={() => setImageState('error')}
        />
        <Image
          source={{ uri: swatch }}
          style={{ width: 96, height: 48, backgroundColor: '#ddd' }}
          resizeMode="contain"
        />
        <Image
          source={{ uri: swatch }}
          style={{ width: 96, height: 48, backgroundColor: '#ddd' }}
          resizeMode="cover"
        />
        <Image
          source={{ uri: swatch }}
          style={{ width: 96, height: 48, tintColor: '#a020c0' }}
          resizeMode="stretch"
        />
      </View>
      <Text testID="macos-input-events">{inputEvents}</Text>
      <TextInput
        testID="macos-input"
        value={name}
        placeholder="Your name"
        onChangeText={setName}
        onFocus={() => log('focus')}
        onBlur={() => log('blur')}
        onSubmitEditing={() => log(`submit:${name}`)}
        style={{
          borderWidth: 1,
          borderColor: '#888',
          borderRadius: 4,
          padding: 4,
          marginTop: 4,
          fontSize: 14,
        }}
      />
      <TextInput
        testID="macos-input-upper"
        value={shout}
        placeholder="Uppercased"
        onChangeText={(text) => setShout(text.toUpperCase())}
        maxLength={8}
        style={{
          borderWidth: 1,
          borderColor: '#888',
          borderRadius: 4,
          padding: 4,
          marginTop: 4,
          fontSize: 14,
        }}
      />
      <TextInput
        testID="macos-input-secure"
        secureTextEntry
        placeholder="Password"
        style={{
          borderWidth: 1,
          borderColor: '#888',
          borderRadius: 4,
          padding: 4,
          marginTop: 4,
          fontSize: 14,
        }}
      />
      <TextInput
        testID="macos-input-multiline"
        multiline
        value={notes}
        placeholder="Notes"
        onChangeText={setNotes}
        style={{
          borderWidth: 1,
          borderColor: '#888',
          borderRadius: 4,
          padding: 4,
          marginTop: 4,
          height: 54,
          fontSize: 14,
        }}
      />
    </View>
  )
}
