import { useEffect, useState } from 'react'
import { One } from 'one'
import { Text, View } from 'react-native'

// a live scoreboard that enters picture in picture when the app leaves the screen.
export function PipScene() {
  const [seconds, setSeconds] = useState(62 * 60 + 14)
  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <One.UI.PictureInPicture
      autoEnter
      style={{
        width: 320,
        aspectRatio: 16 / 9,
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
        <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>
          LIVE {clock}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>SF</Text>
        <Text style={{ color: 'white', fontSize: 52, fontWeight: '800' }}>3 – 2</Text>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>LA</Text>
      </View>
    </One.UI.PictureInPicture>
  )
}
