import { createContext, useContext, useState } from 'react'
import { One } from 'one'
import { Pressable, Text, View } from 'react-native'
const Value = createContext('missing')
function Badge() {
  const value = useContext(Value)
  const [count, setCount] = useState(0)
  return (
    <Pressable
      accessibilityRole="button"
      testID="portal-badge"
      onPress={() => setCount(count + 1)}
      style={{
        position: 'absolute',
        right: 8,
        bottom: 8,
        padding: 8,
        backgroundColor: '#1769aa',
      }}
    >
      <Text style={{ color: 'white' }}>
        {value}:{count}
      </Text>
    </Pressable>
  )
}
export default function PortalFixture() {
  const [host, setHost] = useState(true)
  const [wide, setWide] = useState(false)
  const [replacement, setReplacement] = useState(false)
  const [destination, setDestination] = useState('fixture')
  return (
    <Value.Provider value="context">
      <View
        style={{
          flex: 1,
          padding: 24,
          paddingTop: 64,
          backgroundColor: 'white',
          gap: 12,
        }}
      >
        <Text>One.UI.Portal</Text>
        <One.UI.Portal testID="inline-portal">
          <Text>inline child</Text>
        </One.UI.Portal>
        <View
          testID="portal-source"
          style={{ height: 100, width: 280, backgroundColor: '#eee' }}
        >
          <Text>source</Text>
          <One.UI.Portal hostName={destination} name="badge" style={{ width: '100%', height: 80 }}>
            <Badge />
          </One.UI.Portal>
        </View>
        {host && (
          <One.UI.PortalHost
            name="fixture"
            testID="portal-host"
            style={{
              width: wide ? 280 : 180,
              height: wide ? 180 : 120,
              backgroundColor: '#cde7dc',
            }}
          >
            <Text>host child</Text>
          </One.UI.PortalHost>
        )}
        <One.UI.PortalHost
          name="other"
          testID="portal-other"
          style={{ width: 220, height: 90, backgroundColor: '#f0dcbe' }}
        />
        <One.UI.Portal hostName="fixture" name="order-a">
          <View
            testID="portal-first"
            style={{
              position: 'absolute',
              left: 8,
              top: 30,
              width: 40,
              height: 30,
              backgroundColor: '#d24',
            }}
          />
        </One.UI.Portal>
        <One.UI.Portal hostName="fixture" name="order-b">
          <View
            testID="portal-last"
            style={{
              position: 'absolute',
              left: 24,
              top: 40,
              width: 40,
              height: 30,
              backgroundColor: '#824',
            }}
          />
        </One.UI.Portal>
        {replacement && (
          <One.UI.Portal hostName={destination} name="badge">
            <Text
              testID="portal-replacement"
              style={{ position: 'absolute', right: 8, bottom: 8 }}
            >
              replacement
            </Text>
          </One.UI.Portal>
        )}
        <Pressable
          accessibilityRole="button"
          testID="portal-toggle-host"
          onPress={() => setHost(!host)}
        >
          <Text>toggle host</Text>
        </Pressable>
        <Pressable accessibilityRole="button" testID="portal-resize" onPress={() => setWide(!wide)}>
          <Text>resize host</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          testID="portal-replace"
          onPress={() => setReplacement(!replacement)}
        >
          <Text>replace name</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          testID="portal-switch"
          onPress={() => setDestination(destination === 'fixture' ? 'other' : 'fixture')}
        >
          <Text>switch host</Text>
        </Pressable>
      </View>
    </Value.Provider>
  )
}
