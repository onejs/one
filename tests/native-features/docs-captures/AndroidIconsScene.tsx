import { One } from 'one'

const names = ['home', 'bookmark', 'favorite', 'settings', 'notifications', 'photo_camera'] as const

// material symbols in a compose card: the outlined glyphs, then the filled ones.
export function AndroidIconsScene() {
  return (
    <One.Android.Card
      style={{ width: 340 }}
      colors={{ containerColor: '#FFFFFF' }}
      composeStyle={{ cornerRadius: 28 }}
    >
      <One.Android.Column spacing={18} composeStyle={{ padding: 24 }}>
        {[false, true].map((filled) => (
          <One.Android.Row key={String(filled)} horizontalArrangement="spaceBetween" composeStyle={{ fillMaxWidth: true }}>
            {names.map((name) => (
              <One.Android.Icon
                key={name}
                name={name}
                size={32}
                filled={filled}
                composeStyle={{ foregroundColor: filled ? '#4A5C92' : '#1B1B1F' }}
              />
            ))}
          </One.Android.Row>
        ))}
      </One.Android.Column>
    </One.Android.Card>
  )
}
