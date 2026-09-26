import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidIconButtons() {
  const [clicks, setClicks] = useState(0)
  const [disabledClicks, setDisabledClicks] = useState(0)

  return (
    <One.Android.Column
      testID="one-native-android-icon-buttons-screen"
      style={{ flex: 1 }}
      spacing={20}
      composeStyle={{ padding: 24, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Row spacing={16}>
        <One.Android.IconButton
          testID="one-native-android-icon-button-standard"
          accessibilityLabel="Standard icon button"
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.Icon name="favorite" />
        </One.Android.IconButton>
        <One.Android.FilledIconButton
          testID="one-native-android-icon-button-filled"
          accessibilityLabel="Filled icon button"
          colors={{ containerColor: '#2154a1', contentColor: '#ffffff' }}
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.Icon name="edit" />
        </One.Android.FilledIconButton>
        <One.Android.FilledTonalIconButton
          testID="one-native-android-icon-button-tonal"
          accessibilityLabel="Tonal icon button"
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.Icon name="add" />
        </One.Android.FilledTonalIconButton>
        <One.Android.OutlinedIconButton
          testID="one-native-android-icon-button-outlined"
          accessibilityLabel="Outlined icon button"
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.Icon name="more_vert" />
        </One.Android.OutlinedIconButton>
      </One.Android.Row>
      <One.Android.Row spacing={12}>
        <One.Android.Button
          testID="one-native-android-button-tonal"
          label="Tonal"
          variant="tonal"
          onPress={() => setClicks((value) => value + 1)}
        />
        <One.Android.Button
          testID="one-native-android-button-elevated"
          label="Elevated"
          variant="elevated"
          onPress={() => setClicks((value) => value + 1)}
        />
      </One.Android.Row>
      <One.Android.Row spacing={12}>
        <One.Android.SmallFloatingActionButton
          testID="one-native-android-fab-small"
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.SmallFloatingActionButton.Icon><One.Android.Icon name="add" /></One.Android.SmallFloatingActionButton.Icon>
        </One.Android.SmallFloatingActionButton>
        <One.Android.FloatingActionButton
          testID="one-native-android-fab-medium"
          containerColor="#c6ebc9"
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.FloatingActionButton.Icon><One.Android.Icon name="edit" /></One.Android.FloatingActionButton.Icon>
        </One.Android.FloatingActionButton>
        <One.Android.LargeFloatingActionButton
          testID="one-native-android-fab-large"
          onClick={() => setClicks((value) => value + 1)}
        >
          <One.Android.LargeFloatingActionButton.Icon><One.Android.Icon name="favorite" /></One.Android.LargeFloatingActionButton.Icon>
        </One.Android.LargeFloatingActionButton>
      </One.Android.Row>
      <One.Android.ExtendedFloatingActionButton
        testID="one-native-android-fab-extended"
        expanded={clicks < 5}
        onClick={() => setClicks((value) => value + 1)}
      >
        <One.Android.ExtendedFloatingActionButton.Icon><One.Android.Icon name="add" /></One.Android.ExtendedFloatingActionButton.Icon>
        <One.Android.ExtendedFloatingActionButton.Text><One.Android.Text text="Create" /></One.Android.ExtendedFloatingActionButton.Text>
      </One.Android.ExtendedFloatingActionButton>
      <One.Android.FilledIconButton
        testID="one-native-android-icon-button-disabled"
        accessibilityLabel="Disabled icon button"
        enabled={false}
        colors={{ disabledContainerColor: '#a2a2a2', disabledContentColor: '#303030' }}
        onClick={() => setDisabledClicks((value) => value + 1)}
      >
        <One.Android.Icon name="close" />
      </One.Android.FilledIconButton>
      <One.Android.Text
        testID="one-native-android-icon-buttons-status"
        text={`Clicks: ${clicks} · Disabled: ${disabledClicks}`}
      />
    </One.Android.Column>
  )
}
