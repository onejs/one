import { useState } from 'react'
import { One } from 'one'
import { View } from 'react-native'

// swiftui text entry in a native form: a field, a secure field, and an editor.
export function IosTextScene() {
  const [email, setEmail] = useState('ada@example.com')
  const [password, setPassword] = useState('correct horse')
  const [notes, setNotes] = useState(
    'Pack the charger, the blue notebook, and the tickets for Thursday.'
  )
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
      <One.iOS.Form style={{ flex: 1 }}>
        <One.iOS.Section title="Account">
          <One.iOS.Label label="Ada Lovelace" systemImage="person.crop.circle.fill" />
          <One.iOS.TextField label="Email" prompt="Email" text={email} onTextChange={setEmail} />
          <One.iOS.SecureField
            label="Password"
            prompt="Password"
            text={password}
            onTextChange={setPassword}
          />
        </One.iOS.Section>
        <One.iOS.Section title="Notes">
          <One.iOS.TextEditor
            text={notes}
            onTextChange={setNotes}
            accessibilityLabel="Notes"
            style={{ height: 96 }}
          />
        </One.iOS.Section>
      </One.iOS.Form>
    </View>
  )
}
