import { useState } from 'react'
import { One } from 'one'

const columnItems = Array.from({ length: 20 }, (_, index) => `List item ${index + 1}`)
const rowItems = Array.from({ length: 20 }, (_, index) => `Row item ${index + 1}`)

export default function OneNativeAndroidLists() {
  const [mode, setMode] = useState<'column' | 'row'>('column')

  return (
    <One.Android.Column
      testID="one-native-android-lists-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-lists-status"
        text={`Mode: ${mode} · Taps: 0`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-lists-toggle"
          label={mode === 'column' ? 'Show row' : 'Show column'}
          variant="tonal"
          onPress={() => setMode(mode === 'column' ? 'row' : 'column')}
        />
        <One.Android.Button
          testID="one-native-android-lists-decoy"
          label="Decoy"
          variant="text"
        />
      </One.Android.Row>
      {mode === 'row' ? (
        <One.Android.LazyRow
          testID="one-native-android-lists-row"
          horizontalArrangement={{ spacedBy: 8 }}
          composeStyle={{ height: 64, fillMaxWidth: true }}
        >
          {rowItems.map((item, index) => (
            <One.Android.Text
              key={item}
              testID={`one-native-android-lists-row-item-${index + 1}`}
              text={item}
              composeStyle={{ width: 120 }}
            />
          ))}
        </One.Android.LazyRow>
      ) : (
        <One.Android.LazyColumn
          testID="one-native-android-lists-col"
          verticalArrangement={{ spacedBy: 8 }}
          contentPadding={{ top: 8, bottom: 8 }}
          composeStyle={{ height: 320, fillMaxWidth: true }}
        >
          {columnItems.map((item, index) => (
            <One.Android.Text
              key={item}
              testID={`one-native-android-lists-item-${index + 1}`}
              text={item}
            />
          ))}
        </One.Android.LazyColumn>
      )}
    </One.Android.Column>
  )
}
