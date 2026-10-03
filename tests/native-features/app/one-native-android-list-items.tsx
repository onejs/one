import { One } from 'one'

export default function OneNativeAndroidListItems() {
  return (
    <One.Android.Column
      testID="one-native-android-list-items-screen"
      style={{ flex: 1 }}
      spacing={20}
      composeStyle={{ padding: 20, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.ListItem
        testID="one-native-android-list-item-full"
        composeStyle={{ fillMaxWidth: true }}
        tonalElevation={2}
        shadowElevation={1}
        colors={{
          containerColor: '#e8f3ff',
          contentColor: '#132d4f',
          leadingContentColor: '#174f92',
          trailingContentColor: '#174f92',
          supportingContentColor: '#385b78',
          overlineContentColor: '#385b78',
        }}
      >
        <One.Android.ListItem.HeadlineContent>
          <One.Android.Text text="Inbox" testID="one-native-android-list-item-headline" />
        </One.Android.ListItem.HeadlineContent>
        <One.Android.ListItem.OverlineContent>
          <One.Android.Text text="Messages" testID="one-native-android-list-item-overline" />
        </One.Android.ListItem.OverlineContent>
        <One.Android.ListItem.SupportingContent>
          <One.Android.Text text="Three unread messages" testID="one-native-android-list-item-supporting" />
        </One.Android.ListItem.SupportingContent>
        <One.Android.ListItem.LeadingContent>
          <One.Android.Icon name="inbox" size={28} />
        </One.Android.ListItem.LeadingContent>
        <One.Android.ListItem.TrailingContent>
          <One.Android.Text text="3" testID="one-native-android-list-item-trailing" />
        </One.Android.ListItem.TrailingContent>
      </One.Android.ListItem>
      <One.Android.ListItem
        testID="one-native-android-list-item-minimal"
        composeStyle={{ fillMaxWidth: true }}
      >
        <One.Android.ListItem.HeadlineContent>
          <One.Android.Text text="Archived" testID="one-native-android-list-item-minimal-headline" />
        </One.Android.ListItem.HeadlineContent>
      </One.Android.ListItem>
    </One.Android.Column>
  )
}
