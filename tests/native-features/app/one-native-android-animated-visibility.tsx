import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidAnimatedVisibility() {
  const [visible, setVisible] = useState(true)

  return (
    <One.Android.Column
      testID="one-native-android-animated-visibility-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-animated-visibility-status"
        text={`Visible: ${visible ? 'yes' : 'no'}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-animated-visibility-toggle"
          label={visible ? 'Hide' : 'Show'}
          variant="tonal"
          onPress={() => setVisible(!visible)}
        />
        <One.Android.Button
          testID="one-native-android-animated-visibility-decoy"
          label="Decoy"
          variant="text"
        />
      </One.Android.Row>
      <One.Android.AnimatedVisibility
        testID="one-native-android-animated-visibility-box"
        visible={visible}
        enter="scale"
        exit="fade"
      >
        <One.Android.Text
          testID="one-native-android-animated-visibility-content"
          text="Now you see me"
        />
      </One.Android.AnimatedVisibility>
    </One.Android.Column>
  )
}
