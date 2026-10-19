import { useState } from 'react'
import { One } from 'one'

export function SettingsTab() {
  const [notifications, setNotifications] = useState(true)
  const [previews, setPreviews] = useState(true)
  const [readReceipts, setReadReceipts] = useState(false)
  const [theme, setTheme] = useState('system')
  const [autoDownload, setAutoDownload] = useState('wifi')

  return (
    <One.iOS.Form style={{ flex: 1 }} testID="chat-stress-settings">
      <One.iOS.Section title="Account">
        <One.iOS.LabeledContent label="Name" value="Test User" systemImage="person" />
        <One.iOS.LabeledContent label="Phone" value="+1 555 0100" systemImage="phone" />
      </One.iOS.Section>
      <One.iOS.Section title="Notifications" footer="Muted chats never badge.">
        <One.iOS.Toggle
          label="Allow notifications"
          isOn={notifications}
          onIsOnChange={setNotifications}
          testID="chat-stress-toggle-notifications"
        />
        <One.iOS.Toggle
          label="Show previews"
          isOn={previews}
          onIsOnChange={setPreviews}
          testID="chat-stress-toggle-previews"
        />
        <One.iOS.Toggle
          label="Read receipts"
          isOn={readReceipts}
          onIsOnChange={setReadReceipts}
          testID="chat-stress-toggle-receipts"
        />
      </One.iOS.Section>
      <One.iOS.Section title="Appearance">
        <One.iOS.Picker
          label="Theme"
          selection={theme}
          onSelectionChange={setTheme}
          testID="chat-stress-picker-theme"
        >
          <One.iOS.Text text="System" swiftStyle={{ tag: 'system' }} />
          <One.iOS.Text text="Light" swiftStyle={{ tag: 'light' }} />
          <One.iOS.Text text="Dark" swiftStyle={{ tag: 'dark' }} />
        </One.iOS.Picker>
        <One.iOS.Picker
          label="Auto-download media"
          selection={autoDownload}
          onSelectionChange={setAutoDownload}
          swiftStyle={{ pickerStyle: 'menu' }}
          testID="chat-stress-picker-download"
        >
          <One.iOS.Text text="Never" swiftStyle={{ tag: 'never' }} />
          <One.iOS.Text text="Wi-Fi" swiftStyle={{ tag: 'wifi' }} />
          <One.iOS.Text text="Always" swiftStyle={{ tag: 'always' }} />
        </One.iOS.Picker>
      </One.iOS.Section>
      <One.iOS.Section title="Storage">
        <One.iOS.LabeledContent label="Messages" value="1,240" />
        <One.iOS.LabeledContent label="Media" value="312 MB" />
      </One.iOS.Section>
    </One.iOS.Form>
  )
}
