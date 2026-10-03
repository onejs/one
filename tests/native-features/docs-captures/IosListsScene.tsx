import { One } from 'one'
import { View } from 'react-native'

const mailboxes = [
  { label: 'Inbox', systemImage: 'tray' },
  { label: 'Drafts', systemImage: 'doc' },
  { label: 'Sent', systemImage: 'paperplane' },
  { label: 'Archive', systemImage: 'archivebox' },
]
const smart = [
  { label: 'Flagged', systemImage: 'flag' },
  { label: 'Unread', systemImage: 'envelope.badge' },
]

// a swiftui inset grouped list with section headers and symbol rows.
export function IosListsScene() {
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      <One.iOS.List listStyle="insetGrouped" style={{ flex: 1 }}>
        <One.iOS.Section title="Mailboxes">
          {mailboxes.map((row) => (
            <One.iOS.Label key={row.label} {...row} />
          ))}
        </One.iOS.Section>
        <One.iOS.Section title="Smart Lists" footer="Updated just now">
          {smart.map((row) => (
            <One.iOS.Label key={row.label} {...row} />
          ))}
        </One.iOS.Section>
      </One.iOS.List>
    </View>
  )
}
