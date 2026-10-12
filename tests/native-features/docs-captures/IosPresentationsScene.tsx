import { useState } from 'react'
import { One } from 'one'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'

const trips = [
  { city: 'Lisbon', dates: 'May 12 – 16', color: '#F4A259' },
  { city: 'Kyoto', dates: 'Jun 3 – 10', color: '#5B8E7D' },
]

// a trips screen with a medium sheet over it. the scene shows a small card first so the
// capture can find it on the alternating background; a long press from the capture covers
// the screen and presents the sheet.
export function IosPresentationsScene() {
  const window = useWindowDimensions()
  const [presented, setPresented] = useState(false)

  if (!presented)
    return (
      <Pressable
        onLongPress={() => setPresented(true)}
        style={{ width: 120, height: 60, borderRadius: 16, backgroundColor: '#F4A259' }}
      />
    )

  return (
    <View
      style={{
        position: 'absolute',
        left: -window.width / 2,
        top: -window.height / 2,
        width: window.width,
        height: window.height,
        backgroundColor: '#F2F2F7',
        paddingTop: 72,
        paddingHorizontal: 20,
        gap: 14,
      }}
    >
      <Text style={{ fontSize: 34, fontWeight: '700' }}>Trips</Text>
      {trips.map((trip) => (
        <View
          key={trip.city}
          style={{
            height: 120,
            borderRadius: 22,
            borderCurve: 'continuous',
            backgroundColor: trip.color,
            padding: 18,
            justifyContent: 'flex-end',
          }}
        >
          <Text style={{ color: 'white', fontSize: 24, fontWeight: '700' }}>{trip.city}</Text>
          <Text style={{ color: 'white', fontSize: 15, opacity: 0.85 }}>{trip.dates}</Text>
        </View>
      ))}
      <One.iOS.Sheet
        isPresented
        onIsPresentedChange={() => {}}
        presentationDetents={['medium', 'large']}
        presentationDragIndicator="visible"
      >
        <One.iOS.Form style={{ flex: 1 }}>
          <One.iOS.Section title="Lisbon">
            <One.iOS.LabeledContent label="Flight" value="TP 1351" systemImage="airplane" />
            <One.iOS.LabeledContent label="Hotel" value="Memmo Alfama" systemImage="bed.double" />
            <One.iOS.LabeledContent label="Check in" value="May 12, 3 PM" systemImage="clock" />
          </One.iOS.Section>
          <One.iOS.Section>
            <One.iOS.Toggle label="Trip reminders" isOn onIsOnChange={() => {}} />
            <One.iOS.Button label="Share Trip" />
          </One.iOS.Section>
        </One.iOS.Form>
      </One.iOS.Sheet>
    </View>
  )
}
