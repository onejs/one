import { One } from 'one'
import { Text, View } from 'react-native'

const messages = [
  { from: 'Ava Chen', subject: 'Trip photos', preview: 'Here are the ones from the ferry.' },
  { from: 'Northwind', subject: 'Your order shipped', preview: 'Arriving Thursday by 8 PM.' },
  { from: 'Sam Ortiz', subject: 'Lunch Friday?', preview: 'The new place on Valencia.' },
  { from: 'Library', subject: 'Hold ready', preview: 'Pick up within seven days.' },
]

// a mailbox in a rounded frame: a swiftui navigation stack with an inline title and
// toolbar buttons around react native rows.
export function IosNavigationScene() {
  return (
    <View
      style={{
        width: 340,
        height: 520,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
      }}
    >
      <One.iOS.NavigationStack
        style={{ flex: 1 }}
        swiftStyle={{ navigationTitleWithText: 'Inbox', navigationBarTitleDisplayMode: 'inline' }}
      >
        <One.iOS.Toolbar>
          <One.iOS.ToolbarItem placement="topBarLeading">
            <One.iOS.Button label="Filter" systemImage="line.3.horizontal.decrease" />
          </One.iOS.ToolbarItem>
          <One.iOS.ToolbarItem placement="topBarTrailing">
            <One.iOS.Button label="Compose" systemImage="square.and.pencil" />
          </One.iOS.ToolbarItem>
        </One.iOS.Toolbar>
        <View style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 20 }}>
          {messages.map((message) => (
            <View
              key={message.from}
              style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#C6C6C8', gap: 2 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600' }}>{message.from}</Text>
              <Text style={{ fontSize: 15 }}>{message.subject}</Text>
              <Text style={{ fontSize: 14, color: '#8E8E93' }}>{message.preview}</Text>
            </View>
          ))}
        </View>
      </One.iOS.NavigationStack>
    </View>
  )
}
