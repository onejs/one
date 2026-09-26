import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidFilterChip() {
  const [selected, setSelected] = useState(false)
  const [accept, setAccept] = useState(false)
  const [requests, setRequests] = useState(0)
  const [disabledRequests, setDisabledRequests] = useState(0)

  return (
    <One.Android.Column
      testID="one-native-android-filter-chip-screen"
      style={{ flex: 1 }}
      spacing={16}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.FilterChip
        testID="one-native-android-filter-chip-control"
        selected={selected}
        colors={{ selectedContainerColor: '#b6e7cc', selectedLabelColor: '#123524' }}
        border={{ width: 2, color: '#176c48' }}
        onClick={() => {
          setRequests((value) => value + 1)
          if (accept) setSelected((value) => !value)
        }}
      >
        <One.Android.FilterChip.Label>
          <One.Android.Text text="Filter chip" testID="one-native-android-filter-chip-label" />
        </One.Android.FilterChip.Label>
        <One.Android.FilterChip.LeadingIcon>
          <One.Android.Icon
            name="check"
            accessibilityLabel="Leading check icon"
            testID="one-native-android-filter-chip-leading"
          />
        </One.Android.FilterChip.LeadingIcon>
        <One.Android.FilterChip.TrailingIcon>
          <One.Android.Icon
            name="close"
            accessibilityLabel="Trailing close icon"
            testID="one-native-android-filter-chip-trailing"
          />
        </One.Android.FilterChip.TrailingIcon>
      </One.Android.FilterChip>
      <One.Android.Text
        testID="one-native-android-filter-chip-status"
        text={`Selected: ${selected ? 'yes' : 'no'} · Requests: ${requests} · Policy: ${accept ? 'accept' : 'reject'}`}
      />
      <One.Android.Button
        label="Toggle policy"
        testID="one-native-android-filter-chip-policy"
        onPress={() => setAccept((value) => !value)}
      />
      <One.Android.FilterChip
        testID="one-native-android-filter-chip-disabled"
        selected={false}
        enabled={false}
        onClick={() => setDisabledRequests((value) => value + 1)}
      >
        <One.Android.FilterChip.Label>
          <One.Android.Text text="Disabled chip" />
        </One.Android.FilterChip.Label>
      </One.Android.FilterChip>
      <One.Android.Text
        testID="one-native-android-filter-chip-disabled-status"
        text={`Disabled requests: ${disabledRequests}`}
      />
    </One.Android.Column>
  )
}
