import { useRef, useState } from 'react'
import { Image, Pressable, ScrollView, Text, TextInput, useColorScheme, useWindowDimensions, View } from 'react-native'
import { One } from 'one'
import { probe } from '../probe/resolution'

const swatch = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAASUlEQVR4nO3QMQ0AMAgAMOTsRh1id8/GkEFCetRA42b+SafeqBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQL2BzRVihEezZkGnAAAAABJRU5ErkJggg=='

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

export default function Index() {
  const [isOn, setIsOn] = useState(false)
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
    <View style={{ flex: 1, padding: 16 }}>
      <Text testID="macos-label">macOS</Text>
      <Text testID="macos-probe">{probe}</Text>
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
          setTimeout(() => rowRef.current?.measureInWindow((_x, y) => setRowY(`row y ${Math.round(y)}`)), 400)
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
          onLoad={(event) => setImageState(`loaded ${event.nativeEvent.source.width}x${event.nativeEvent.source.height}`)}
          onError={() => setImageState('error')}
        />
        <Image source={{ uri: swatch }} style={{ width: 96, height: 48, backgroundColor: '#ddd' }} resizeMode="contain" />
        <Image source={{ uri: swatch }} style={{ width: 96, height: 48, backgroundColor: '#ddd' }} resizeMode="cover" />
        <Image source={{ uri: swatch }} style={{ width: 96, height: 48, tintColor: '#a020c0' }} resizeMode="stretch" />
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
        style={{ borderWidth: 1, borderColor: '#888', borderRadius: 4, padding: 4, marginTop: 4, fontSize: 14 }}
      />
      <TextInput
        testID="macos-input-upper"
        value={shout}
        placeholder="Uppercased"
        onChangeText={(text) => setShout(text.toUpperCase())}
        maxLength={8}
        style={{ borderWidth: 1, borderColor: '#888', borderRadius: 4, padding: 4, marginTop: 4, fontSize: 14 }}
      />
      <TextInput
        testID="macos-input-secure"
        secureTextEntry
        placeholder="Password"
        style={{ borderWidth: 1, borderColor: '#888', borderRadius: 4, padding: 4, marginTop: 4, fontSize: 14 }}
      />
      <TextInput
        testID="macos-input-multiline"
        multiline
        value={notes}
        placeholder="Notes"
        onChangeText={setNotes}
        style={{ borderWidth: 1, borderColor: '#888', borderRadius: 4, padding: 4, marginTop: 4, height: 54, fontSize: 14 }}
      />
    </View>
  )
}
