import { useRef, useState } from 'react'
import { One, type ComposeSnackbarHostRef } from 'one'

export default function OneNativeAndroidSnackbar() {
  const host = useRef<ComposeSnackbarHostRef>(null)
  const [result, setResult] = useState('none')

  const showAction = async () => {
    // indefinite keeps the action tappable under slow-device dump latency;
    // short durations are still covered by the plain and dismiss snackbars.
    const outcome = await host.current?.showSnackbar({
      message: 'File saved',
      actionLabel: 'Undo',
      duration: 'indefinite',
    })
    if (outcome) setResult(outcome)
  }

  const showPlain = async () => {
    const outcome = await host.current?.showSnackbar({ message: 'Just a note', duration: 'short' })
    if (outcome) setResult(outcome)
  }

  const showDismiss = async () => {
    const outcome = await host.current?.showSnackbar({
      message: 'With close',
      withDismissAction: true,
      duration: 'short',
    })
    if (outcome) setResult(outcome)
  }

  return (
    <One.Android.Column
      testID="one-native-android-snackbar-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-snackbar-status"
        text={`Result: ${result}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-snackbar-show-action"
          label="Show action"
          variant="tonal"
          onPress={() => void showAction()}
        />
        <One.Android.Button
          testID="one-native-android-snackbar-show-plain"
          label="Show plain"
          variant="outlined"
          onPress={() => void showPlain()}
        />
      </One.Android.Row>
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-snackbar-show-dismiss"
          label="Show dismiss"
          variant="outlined"
          onPress={() => void showDismiss()}
        />
        <One.Android.Button
          testID="one-native-android-snackbar-decoy"
          label="Decoy"
          variant="text"
        />
      </One.Android.Row>
      <One.Android.SnackbarHost
        testID="one-native-android-snackbar-host"
        ref={host}
        composeStyle={{ fillMaxWidth: true }}
      >
        <One.Android.Snackbar containerColor="#1b1b1f" />
      </One.Android.SnackbarHost>
    </One.Android.Column>
  )
}
