import { useState } from 'react'
import { Image, Platform, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native'
import { One } from 'one'
import { probe } from '../probe/resolution'

export default function Index() {
  const dark = useColorScheme() === 'dark'
  const [isOn, setIsOn] = useState(false)
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState('none')
  const [notes, setNotes] = useState('')
  const [boxPress, setBoxPress] = useState('')
  const [touchCoords, setTouchCoords] = useState('')
  const [pointerCoords, setPointerCoords] = useState('')
  const [drag, setDrag] = useState({
    phase: 'ready',
    moves: 0,
    x: 0,
    y: 0,
    buttons: 0,
    button: -1,
  })
  const readDrag = (phase: string, event: any) => {
    const { offsetX, offsetY, buttons, button } = event.nativeEvent
    setDrag((last) => ({
      phase,
      moves: phase === 'down' ? 0 : last.moves + (phase === 'move' ? 1 : 0),
      x: round(offsetX),
      y: round(offsetY),
      buttons,
      button,
    }))
  }
  const [images, setImages] = useState<Record<string, string>>({})
  const [nativePresses, setNativePresses] = useState(0)
  const [segment, setSegment] = useState(0)
  const [level, setLevel] = useState(0.25)
  const [choice, setChoice] = useState(0)
  const [controlRevision, setControlRevision] = useState(0)
  const [controlEvents, setControlEvents] = useState(0)
  const [acceptChanges, setAcceptChanges] = useState(true)
  const report = (key: string, value: string) => setImages((state) => ({ ...state, [key]: value }))
  const remote = { uri: 'http://127.0.0.1:8123/swatch.png' }
  const boxes = [
    {},
    { transform: [{ translateX: 12 }, { translateY: 14 }] },
    { transform: [{ scale: 1.4 }] },
    { transform: [{ rotate: '30deg' }] },
    { opacity: 0.4 },
    { transform: [{ rotate: '-20deg' }, { scaleX: 1.3 }], backgroundColor: '#b58900' },
  ]
  const round = (value: number) => Math.round(value * 10) / 10
  const readTouch = (name: string, event: any) => {
    const { locationX, locationY, pageX, pageY } = event.nativeEvent
    setTouchCoords(`${name} touch ${round(locationX)},${round(locationY)} page ${round(pageX)},${round(pageY)}`)
  }
  const readPointer = (name: string, event: any) => {
    const { offsetX, offsetY, clientX, clientY } = event.nativeEvent
    setPointerCoords(`${name} pointer offset ${round(offsetX)},${round(offsetY)} client ${round(clientX)},${round(clientY)}`)
  }
  const modes = ['cover', 'contain', 'stretch', 'center'] as const
  return (
    <View style={{ flex: 1, flexDirection: 'row', padding: 24, backgroundColor: dark ? '#1f1d1a' : '#f4f1ea' }}>
      <View style={{ width: 560 }}>
      <Text testID="linux-label" style={{ fontSize: 32, fontWeight: '700', color: dark ? '#f4f1ea' : '#1f1d1a' }}>
        One on Linux
      </Text>
      <Text testID="linux-scheme" style={{ fontSize: 16, color: dark ? '#e8e3d6' : '#5f5a50' }}>
        {`color scheme ${dark ? 'dark' : 'light'}`}
      </Text>
      <Text testID="linux-env" style={{ fontSize: 16, color: '#5f5a50', marginTop: 4 }}>
        {`platform ${Platform.OS} / ${One.platform}, resolved ${probe}`}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
        <One.linux.Switch isOn={isOn} revision={0} onIsOnChange={(event) => setIsOn(event.isOn)} />
        <Text testID="linux-switch" style={{ fontSize: 20, marginLeft: 12, color: '#1f1d1a' }}>
          {isOn ? 'switch on' : 'switch off'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
        <Pressable
          testID="linux-counter"
          onPress={() => setCount((value) => value + 1)}
          style={({ pressed }) => ({
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 8,
            backgroundColor: pressed ? '#1a4f8f' : '#2b6cb0',
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#ffffff' }}>Press me</Text>
        </Pressable>
        <Text testID="linux-count" style={{ fontSize: 20, marginLeft: 12, color: '#1f1d1a' }}>
          {`pressed ${count} times`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24 }}>
        <TextInput
          testID="linux-input"
          value={name}
          onChangeText={setName}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="type here"
          placeholderTextColor="#c0392b"
          selectionColor="#9b00d1"
          style={{
            width: 200,
            height: 40,
            paddingHorizontal: 10,
            fontSize: 18,
            color: '#1f1d1a',
            borderWidth: 1,
            borderRadius: 8,
            borderColor: focused ? '#2b6cb0' : '#c9c2b2',
            backgroundColor: '#ffffff',
          }}
        />
        <Text testID="linux-echo" style={{ fontSize: 20, marginLeft: 12, color: '#1f1d1a' }}>
          {`typed "${name}"`}
        </Text>
      </View>
      <Text testID="linux-offset" style={{ fontSize: 16, marginTop: 24, color: '#5f5a50' }}>
        {`scroll offset ${Math.round(offset)}`}
      </Text>
      <ScrollView
        testID="linux-scroll"
        scrollEventThrottle={16}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.y)}
        style={{ height: 260, marginTop: 8, borderWidth: 1, borderColor: '#c9c2b2', borderRadius: 8 }}
      >
        <View style={{ padding: 12, gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f1d1a' }}>
            GTK controls with React Native content
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <One.linux.Button
              title="Native button"
              onPress={() => setNativePresses((value) => value + 1)}
            />
            <One.linux.Button
              title="Disabled"
              disabled
              style={{ width: 100 }}
              onPress={() => setNativePresses((value) => value + 100)}
            />
            <Text
              style={{ fontSize: 14, color: '#1f1d1a' }}
            >{`${nativePresses} presses`}</Text>
          </View>
          <One.linux.SegmentedControl
            labels={['One', 'Two', 'Three']}
            selectedIndex={segment}
            revision={controlRevision}
            onChange={(event) => {
              setControlEvents((value) => value + 1)
              if (acceptChanges) setSegment(event.selectedIndex)
            }}
          />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <One.linux.Slider
              value={level}
              revision={controlRevision}
              onValueChange={(event) => {
                setControlEvents((value) => value + 1)
                if (acceptChanges) setLevel(event.value)
              }}
            />
            <Text
              style={{ fontSize: 14, color: '#1f1d1a' }}
            >{`level ${Math.round(level * 100)}%`}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <One.linux.DropDown
              labels={['Alpha', 'Beta', 'Gamma']}
              selectedIndex={choice}
              revision={controlRevision}
              onChange={(event) => {
                setControlEvents((value) => value + 1)
                if (acceptChanges) setChoice(event.selectedIndex)
              }}
            />
            <Text
              style={{ fontSize: 14, color: '#1f1d1a' }}
            >{`segment ${segment}, choice ${choice}`}</Text>
          </View>
          <One.linux.ProgressBar value={level} />
          <Text
            style={{ fontSize: 14, color: '#1f1d1a' }}
          >{`${controlEvents} native changes, revision ${controlRevision}`}</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <One.linux.Button
              title="Reset controls"
              onPress={() => {
                setSegment(0)
                setChoice(0)
                setLevel(0.25)
                setControlRevision((value) => value + 1)
              }}
            />
            <Pressable onPress={() => setAcceptChanges((value) => !value)}>
              <Text style={{ fontSize: 14, color: '#2b6cb0' }}>
                {acceptChanges ? 'accepting changes' : 'rejecting changes'}
              </Text>
            </Pressable>
          </View>
        </View>
        {Array.from({ length: 40 }, (_, index) => (
          <View
            key={index}
            style={{ padding: 10, backgroundColor: index % 2 ? '#ebe6da' : '#f9f7f2' }}
          >
            <Text style={{ fontSize: 16, color: '#1f1d1a' }}>{`row ${index}`}</Text>
          </View>
        ))}
      </ScrollView>
      <View
        onPointerDown={(event) => readDrag('down', event)}
        onPointerMove={(event) => {
          if (event.nativeEvent.buttons) readDrag('move', event)
        }}
        onPointerUp={(event) => readDrag('up', event)}
        style={{
          height: 70,
          marginTop: 12,
          padding: 12,
          backgroundColor: '#d9e8f6',
          borderRadius: 8,
        }}
      >
        <Text pointerEvents="none" style={{ fontSize: 16, color: '#1f1d1a' }}>
          Drag here
        </Text>
        <Text
          pointerEvents="none"
          style={{ fontSize: 14, color: '#1f1d1a' }}
        >{`${drag.phase}: ${drag.moves} moves, local ${drag.x},${drag.y}, buttons ${drag.buttons}, button ${drag.button}`}</Text>
      </View>
      </View>
      <View style={{ marginLeft: 48 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f1d1a' }}>images</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Image
            testID="linux-image-local"
            source={require('../assets/swatch.png')}
            onLoad={(event) => {
              const { width, height } = event.nativeEvent.source
              report('local', `local ${width}x${height}`)
            }}
            onError={(event) => report('local', `local error ${event.nativeEvent.error}`)}
          />
          <Image
            testID="linux-image-remote"
            source={remote}
            style={{ width: 96, height: 64, marginLeft: 12 }}
            onLoad={(event) => {
              const { width, height } = event.nativeEvent.source
              report('remote', `remote ${width}x${height}`)
            }}
            onError={(event) => report('remote', `remote error ${event.nativeEvent.error}`)}
          />
          <Image
            testID="linux-image-missing"
            source={{ uri: 'http://127.0.0.1:8123/missing.png' }}
            style={{ width: 96, height: 64, marginLeft: 12, backgroundColor: '#ebe6da' }}
            onError={() => report('missing', 'missing error')}
            onLoadEnd={() => report('end', 'loadEnd')}
          />
        </View>
        <Text testID="linux-image-status" style={{ fontSize: 14, marginTop: 4, color: '#5f5a50' }}>
          {`${images.local ?? 'local loading'}, ${images.remote ?? 'remote loading'}, ${images.missing ?? 'missing loading'}`}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {modes.map((mode) => (
            <View key={mode} style={{ marginRight: 12 }}>
              <Image
                source={require('../assets/swatch.png')}
                resizeMode={mode}
                style={{ width: 100, height: 100, backgroundColor: '#ebe6da', borderRadius: 12 }}
              />
              <Text style={{ fontSize: 12, color: '#5f5a50' }}>{mode}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 24, color: '#1f1d1a' }}>
          {`transform and opacity ${boxPress}`}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 16, height: 96, alignItems: 'center' }}>
          {boxes.map((style, index) => (
            <Pressable
              key={index}
              onPress={() => setBoxPress(`pressed ${'ABCDEF'[index]}`)}
              onTouchStart={(event) => readTouch('ABCDEF'[index], event)}
              style={[
                {
                  width: 56,
                  height: 56,
                  marginRight: 32,
                  borderRadius: 8,
                  backgroundColor: '#2b6cb0',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                style,
              ]}
            >
              <View
                onPointerEnter={(event) => readPointer('ABCDEF'[index], event)}
                style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>{'ABCDEF'[index]}</Text>
              </View>
            </Pressable>
          ))}
          <View style={{ width: 80, height: 80, padding: 20, backgroundColor: '#d9d3c3' }}>
            <View
              onTouchStart={(event) => readTouch('N', event)}
              onPointerEnter={(event) => readPointer('N', event)}
              style={{ width: 40, height: 40, backgroundColor: '#2f9e44' }}
            />
          </View>
        </View>
        <Text testID="linux-coords" style={{ fontSize: 12, color: '#5f5a50' }}>
          {`${touchCoords} / ${pointerCoords}`}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 24, color: '#1f1d1a' }}>
          hover and cursor
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 16, alignItems: 'center' }}>
          {(['pointer', 'text', 'crosshair', 'not-allowed'] as const).map((cursor) => (
            <Pressable
              key={cursor}
              onHoverIn={() => setHovered(cursor)}
              onHoverOut={() => setHovered('none')}
              style={{
                width: 120,
                height: 40,
                marginRight: 12,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hovered === cursor ? '#b58900' : '#2b6cb0',
                cursor,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 14 }}>{cursor}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 14, color: '#5f5a50', marginTop: 8 }}>
          hovered {hovered}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 16, color: '#1f1d1a' }}>
          multiline
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'flex-start' }}>
          <TextInput
            multiline
            maxLength={12}
            value={notes}
            onChangeText={setNotes}
            placeholder="notes, one per line"
            placeholderTextColor="#c0392b"
            selectionColor="#f1c40f"
            style={{
              width: 300,
              height: 72,
              padding: 8,
              fontSize: 16,
              color: '#1f1d1a',
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#bfb8a8',
              borderRadius: 6,
            }}
          />
          <Text style={{ fontSize: 14, color: '#5f5a50', marginLeft: 12 }}>
            {`${notes.split('\n').length} lines, ${notes.length} chars`}
          </Text>
        </View>
      </View>
    </View>
  )
}
