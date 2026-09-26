import { One } from 'one'

export default function OneNativeAndroidBadges() {
  return (
    <One.Android.Column
      testID="one-native-android-badges-screen"
      style={{ flex: 1 }}
      spacing={28}
      composeStyle={{ padding: 24, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Row spacing={24} verticalAlignment="centerVertically">
        <One.Android.Badge testID="one-native-android-badge-dot" containerColor="#b42318" />
        <One.Android.Badge
          testID="one-native-android-badge-count"
          containerColor="#1c4587"
          contentColor="#ffffff"
        >
          <One.Android.Text text="7" testID="one-native-android-badge-count-text" />
        </One.Android.Badge>
        <One.Android.Badge testID="one-native-android-badge-wide" containerColor="#386a20">
          <One.Android.Text text="999+" testID="one-native-android-badge-wide-text" />
        </One.Android.Badge>
      </One.Android.Row>
      <One.Android.Row spacing={32} verticalAlignment="centerVertically">
        <One.Android.BadgedBox testID="one-native-android-badged-box-count">
          <One.Android.Icon name="notifications" size={36} testID="one-native-android-badged-box-icon" />
          <One.Android.BadgedBox.Badge>
            <One.Android.Badge containerColor="#b42318">
              <One.Android.Text text="3" testID="one-native-android-badged-box-count-text" />
            </One.Android.Badge>
          </One.Android.BadgedBox.Badge>
        </One.Android.BadgedBox>
        <One.Android.BadgedBox testID="one-native-android-badged-box-default">
          <One.Android.Icon name="mail" size={36} testID="one-native-android-badged-box-default-icon" />
        </One.Android.BadgedBox>
      </One.Android.Row>
      <One.Android.Text text="Badge dot, count, wide count, overlay, and default overlay" />
    </One.Android.Column>
  )
}
