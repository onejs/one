import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { One } from 'one'
import { probe } from '../probe/resolution'

export default function Index() {
  const [isOn, setIsOn] = useState(false)
  const [count, setCount] = useState(0)
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
    </View>
  )
}
