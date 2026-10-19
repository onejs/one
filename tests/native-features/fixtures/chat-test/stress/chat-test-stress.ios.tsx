import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'
import { ChatsTab, useChats } from './chats.ios'
import { SettingsTab } from './settings.ios'
import { calls, contacts } from './data'

export default function ChatTestStress() {
  const [tab, setTab] = useState('chats')
  const api = useChats()

  return (
    <View style={styles.screen} testID="chat-stress-screen">
      <One.iOS.TabView
        selection={tab}
        onSelectionChange={setTab}
        style={styles.screen}
        testID="chat-stress-tabs"
      >
        <One.iOS.Tab
          value="chats"
          titleKey="Chats"
          systemImage="bubble.left.and.bubble.right"
          badge={api.unread || undefined}
          testID="chat-stress-tab-chats"
        >
          <ChatsTab api={api} />
        </One.iOS.Tab>
        <One.iOS.Tab
          value="contacts"
          titleKey="Contacts"
          systemImage="person.2"
          testID="chat-stress-tab-contacts"
        >
          <One.iOS.List listStyle="plain" style={styles.screen}>
            {contacts.map((contact) => (
              <One.iOS.LabeledContent
                key={contact.id}
                label={contact.name}
                value={contact.phone}
                systemImage="person.circle"
              />
            ))}
          </One.iOS.List>
        </One.iOS.Tab>
        <One.iOS.Tab
          value="calls"
          titleKey="Calls"
          systemImage="phone"
          testID="chat-stress-tab-calls"
        >
          <One.iOS.List listStyle="plain" style={styles.screen}>
            {calls.map((call) => (
              <One.iOS.LabeledContent
                key={call.id}
                label={call.name}
                value={call.detail}
                systemImage="phone.arrow.up.right"
              />
            ))}
          </One.iOS.List>
        </One.iOS.Tab>
        <One.iOS.Tab
          value="settings"
          titleKey="Settings"
          systemImage="gearshape"
          testID="chat-stress-tab-settings"
        >
          <SettingsTab />
        </One.iOS.Tab>
      </One.iOS.TabView>
      <Text
        style={styles.status}
        testID="chat-stress-unread"
      >{`Unread: ${api.unread}`}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  status: { position: 'absolute', width: 1, height: 1, opacity: 0 },
})
