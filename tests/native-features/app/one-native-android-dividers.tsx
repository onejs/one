import { One } from 'one'

export default function OneNativeAndroidDividers() {
  return (
    <One.Android.Column
      testID="one-native-android-dividers-screen"
      style={{ flex: 1 }}
      spacing={20}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text text="Above horizontal divider" testID="one-native-android-divider-above" />
      <One.Android.HorizontalDivider
        testID="one-native-android-divider-horizontal"
        thickness={4}
        color="#b3261e"
        composeStyle={{ fillMaxWidth: true }}
      />
      <One.Android.Row spacing={20} composeStyle={{ height: 80 }}>
        <One.Android.Text text="Left" testID="one-native-android-divider-left" />
        <One.Android.VerticalDivider
          testID="one-native-android-divider-vertical"
          thickness={4}
          color="#176c48"
          composeStyle={{ fillMaxHeight: true }}
        />
        <One.Android.Text text="Right" testID="one-native-android-divider-right" />
      </One.Android.Row>
    </One.Android.Column>
  )
}
