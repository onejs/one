import { One } from 'one'
import { StyleSheet, Text, View } from 'react-native'

const messages = [
  { from: 'Maya', text: 'Slides for Thursday', time: '9:41', color: '#f59e0b' },
  { from: 'Leo', text: 'Lunch at the usual?', time: '9:12', color: '#3b82f6' },
  { from: 'Ana', text: 'Shipped the fix', time: '8:30', color: '#10b981' },
  { from: 'Sam', text: 'Photos from Sunday', time: 'Mon', color: '#ec4899' },
]

const actions = ['Reply', 'Forward', 'Pin', 'Archive']

// a menu declared inside one clipped row renders in a host that covers the screen.
export function PortalScene() {
  return (
    <View
      style={{
        width: 300,
        height: 420,
        borderRadius: 44,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: 'white',
        paddingTop: 40,
      }}
    >
      <Text style={{ fontSize: 30, fontWeight: '800', paddingHorizontal: 24, marginBottom: 12 }}>
        Messages
      </Text>
      {messages.map((message, index) => (
        <View
          key={message.from}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
            overflow: 'hidden',
            backgroundColor: index === 1 ? '#f1f5f9' : 'white',
          }}
        >
          <View
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: message.color }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{message.from}</Text>
            <Text style={{ fontSize: 14, color: '#64748b' }}>{message.text}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>{message.time}</Text>
          {index === 1 && (
            <One.UI.Portal hostName="docs-overlay" name="menu" style={StyleSheet.absoluteFill}>
              <View
                style={{
                  position: 'absolute',
                  top: 186,
                  right: 20,
                  width: 180,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  backgroundColor: 'white',
                  paddingVertical: 6,
                  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(15, 23, 42, 0.12)',
                }}
              >
                {actions.map((action) => (
                  <Text
                    key={action}
                    style={{
                      fontSize: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      color: action === 'Archive' ? '#dc2626' : '#0f172a',
                    }}
                  >
                    {action}
                  </Text>
                ))}
              </View>
            </One.UI.Portal>
          )}
        </View>
      ))}
      <One.UI.PortalHost name="docs-overlay" style={StyleSheet.absoluteFill} />
    </View>
  )
}
