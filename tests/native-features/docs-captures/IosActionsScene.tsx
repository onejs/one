import { useState } from 'react'
import { One } from 'one'
import { View } from 'react-native'

// swiftui value controls and buttons in a native form, as a settings screen.
export function IosActionsScene() {
  const [airplane, setAirplane] = useState(false)
  const [wifi, setWifi] = useState(true)
  const [volume, setVolume] = useState(60)
  const [guests, setGuests] = useState(2)
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      <One.iOS.Form style={{ flex: 1 }}>
        <One.iOS.Section>
          <One.iOS.Toggle
            label="Airplane Mode"
            systemImage="airplane"
            isOn={airplane}
            onIsOnChange={setAirplane}
          />
          <One.iOS.Toggle label="Wi-Fi" systemImage="wifi" isOn={wifi} onIsOnChange={setWifi} />
        </One.iOS.Section>
        <One.iOS.Section>
          <One.iOS.Slider
            label="Volume"
            value={volume}
            onValueChange={setVolume}
            minimumValueImage="speaker.fill"
            maximumValueImage="speaker.wave.3.fill"
          />
          <One.iOS.Stepper
            label={`Guests: ${guests}`}
            value={guests}
            onValueChange={setGuests}
            minimumValue={1}
            maximumValue={8}
          />
        </One.iOS.Section>
        <One.iOS.Section>
          <One.iOS.Button label="Save" buttonStyle="borderedProminent" />
        </One.iOS.Section>
      </One.iOS.Form>
    </View>
  )
}
