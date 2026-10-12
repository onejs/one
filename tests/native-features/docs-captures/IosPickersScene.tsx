import { useState } from 'react'
import { One } from 'one'
import { View } from 'react-native'

const departure = new Date(2026, 9, 14, 9, 30)

// swiftui pickers in a native form, as a booking screen.
export function IosPickersScene() {
  const [seat, setSeat] = useState('window')
  const [cabin, setCabin] = useState('economy')
  const [date, setDate] = useState(departure)
  const [color, setColor] = useState('#FF9500')
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
          <One.iOS.Picker
            label="Seat"
            selection={seat}
            onSelectionChange={setSeat}
            pickerStyle="segmented"
            options={[
              { value: 'window', label: 'Window' },
              { value: 'middle', label: 'Middle' },
              { value: 'aisle', label: 'Aisle' },
            ]}
          />
          <One.iOS.Picker
            label="Cabin"
            selection={cabin}
            onSelectionChange={setCabin}
            options={[
              { value: 'economy', label: 'Economy' },
              { value: 'business', label: 'Business' },
            ]}
          />
        </One.iOS.Section>
        <One.iOS.Section>
          <One.iOS.DatePicker label="Departs" selection={date} onSelectionChange={setDate} />
          <One.iOS.ColorPicker label="Tag color" selection={color} onSelectionChange={setColor} />
        </One.iOS.Section>
      </One.iOS.Form>
    </View>
  )
}
