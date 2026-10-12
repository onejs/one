import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidSurface() {
  const [clicks, setClicks] = useState(0)
  const [selected, setSelected] = useState(false)
  const [checked, setChecked] = useState(false)
  const [accept, setAccept] = useState(false)
  const [requests, setRequests] = useState(0)
  const [disabledClicks, setDisabledClicks] = useState(0)
  const shape = { fillMaxWidth: true, cornerRadius: 12 }

  return (
    <One.Android.Column
      testID="one-native-android-surface-screen"
      style={{ flex: 1 }}
      spacing={12}
      composeStyle={{ padding: 20, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Surface
        testID="one-native-android-surface-plain"
        composeStyle={shape}
        color="#e8f3ff"
        contentColor="#132d4f"
        tonalElevation={2}
        shadowElevation={1}
        border={{ width: 1, color: '#174f92' }}
      >
        <One.Android.Text text="Plain surface" composeStyle={{ padding: 16 }} />
      </One.Android.Surface>
      <One.Android.Surface
        testID="one-native-android-surface-clickable"
        composeStyle={shape}
        color="#e8f3ff"
        onClick={() => setClicks((value) => value + 1)}
      >
        <One.Android.Text text="Clickable surface" composeStyle={{ padding: 16 }} />
      </One.Android.Surface>
      <One.Android.Surface
        testID="one-native-android-surface-selectable"
        composeStyle={shape}
        color="#e8f3ff"
        selected={selected}
        onClick={() => setSelected((value) => !value)}
      >
        <One.Android.Text text="Selectable surface" composeStyle={{ padding: 16 }} />
      </One.Android.Surface>
      <One.Android.Surface
        testID="one-native-android-surface-toggleable"
        composeStyle={shape}
        color="#e8f3ff"
        checked={checked}
        onCheckedChange={(value) => {
          setRequests((count) => count + 1)
          if (accept) setChecked(value)
        }}
      >
        <One.Android.Text text="Toggleable surface" composeStyle={{ padding: 16 }} />
      </One.Android.Surface>
      <One.Android.Button testID="one-native-android-surface-policy" label="Accept toggles" onPress={() => setAccept(true)} />
      <One.Android.Surface
        testID="one-native-android-surface-disabled"
        composeStyle={shape}
        color="#e8f3ff"
        enabled={false}
        onClick={() => setDisabledClicks((value) => value + 1)}
      >
        <One.Android.Text text="Disabled surface" composeStyle={{ padding: 16 }} />
      </One.Android.Surface>
      <One.Android.Text
        testID="one-native-android-surface-status"
        text={`Clicks: ${clicks} · Selected: ${selected ? 'yes' : 'no'} · Checked: ${checked ? 'yes' : 'no'} · Policy: ${accept ? 'accept' : 'reject'} · Requests: ${requests} · Disabled: ${disabledClicks}`}
      />
    </One.Android.Column>
  )
}
