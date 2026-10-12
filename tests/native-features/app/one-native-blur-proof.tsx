import { useState } from 'react'
import { One } from 'one'
import { Pressable, ScrollView, Text, View } from 'react-native'

// runtime controls for the actual native blur component, with sharp siblings.
export default function BlurProof() {
  const [intensity, setIntensity] = useState(25)
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [scaled, setScaled] = useState(false)
  const tint = dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text testID="blur-proof-state">{`${intensity}/${tint}/${mounted}`}</Text>
      <View
        style={{
          height: 320,
          overflow: 'hidden',
          borderRadius: 16,
          transform: [{ scale: scaled ? 0.75 : 1 }],
        }}
      >
        <ScrollView testID="blur-proof-backdrop">
          {Array.from({ length: 200 }, (_, i) => (
            <View
              key={i}
              style={{ height: 8, backgroundColor: i % 2 ? '#ffffff' : '#000000' }}
            />
          ))}
        </ScrollView>
        {mounted && (
          <One.UI.Blur
            testID="blur-proof-card"
            intensity={intensity}
            tint={tint}
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: 80,
              height: 160,
              overflow: 'hidden',
              borderRadius: 12,
            }}
          >
            <View
              testID="blur-proof-clipped-child"
              style={{
                position: 'absolute',
                left: -12,
                top: -12,
                width: 24,
                height: 24,
                backgroundColor: '#0000ff',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 24,
                top: 24,
                width: 32,
                height: 32,
                backgroundColor: '#ff0000',
              }}
            />
            <Text
              style={{
                position: 'absolute',
                left: 24,
                top: 80,
                color: '#ff0000',
                fontSize: 20,
              }}
            >
              sharp foreground
            </Text>
          </One.UI.Blur>
        )}
      </View>
      {[0, 25, 100].map((value) => (
        <Pressable
          key={value}
          testID={`blur-proof-intensity-${value}`}
          accessibilityRole="button"
          onPress={() => setIntensity(value)}
          style={{ padding: 12, backgroundColor: '#ddd' }}
        >
          <Text>{`Intensity ${value}`}</Text>
        </Pressable>
      ))}
      <Pressable
        testID="blur-proof-tint"
        accessibilityRole="button"
        onPress={() => setDark(!dark)}
        style={{ padding: 12, backgroundColor: '#ddd' }}
      >
        <Text>Change tint</Text>
      </Pressable>
      <Pressable
        testID="blur-proof-mount"
        accessibilityRole="button"
        onPress={() => setMounted(!mounted)}
        style={{ padding: 12, backgroundColor: '#ddd' }}
      >
        <Text>{mounted ? 'Detach blur' : 'Remount blur'}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        testID="blur-proof-scale"
        onPress={() => setScaled(!scaled)}
        style={{ padding: 12, backgroundColor: '#ddd' }}
      >
        <Text>{scaled ? 'Full scale' : 'Scale to 75%'}</Text>
      </Pressable>
    </View>
  )
}
