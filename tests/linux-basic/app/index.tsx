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
  const [images, setImages] = useState<Record<string, string>>({})
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
        style={{ height: 200, marginTop: 8, borderWidth: 1, borderColor: '#c9c2b2', borderRadius: 8 }}
      >
        {Array.from({ length: 40 }, (_, index) => (
          <View
            key={index}
            style={{ padding: 10, backgroundColor: index % 2 ? '#ebe6da' : '#f9f7f2' }}
          >
            <Text style={{ fontSize: 16, color: '#1f1d1a' }}>{`row ${index}`}</Text>
          </View>
        ))}
      </ScrollView>
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
          transform and opacity
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 16, height: 120, alignItems: 'center' }}>
          {boxes.map((style, index) => (
            <View
              key={index}
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
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>{'ABCDEF'[index]}</Text>
            </View>
          ))}
        </View>
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
      </View>
    </View>
  )
}
