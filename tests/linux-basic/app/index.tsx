import { useState } from 'react'
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { One } from 'one'
import { probe } from '../probe/resolution'

export default function Index() {
  const [isOn, setIsOn] = useState(false)
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)
  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: '#f4f1ea' }}>
      <Text testID="linux-label" style={{ fontSize: 32, fontWeight: '700', color: '#1f1d1a' }}>
        One on Linux
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
  )
}
