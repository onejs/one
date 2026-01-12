import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Stack, Protected } from 'one'

export default function ProtectedTestLayout() {
  const [isAuthed, setIsAuthed] = useState(false)

  const toggleAuth = () => {
    setIsAuthed(!isAuthed)
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 10, backgroundColor: '#eee' }}>
        <Text testID="auth-status" accessibilityLabel={`Auth: ${isAuthed ? 'true' : 'false'}`}>Auth: {isAuthed ? 'true' : 'false'}</Text>
        <TouchableOpacity
          testID="toggle-auth"
          onPress={toggleAuth}
          style={{ padding: 10, backgroundColor: '#007AFF', marginTop: 5 }}
          accessibilityRole="button"
        >
          <Text style={{ color: 'white' }}>Toggle Auth</Text>
        </TouchableOpacity>
      </View>

      <Stack>
        <Stack.Screen name="index" options={{ title: 'Public' }} />
        <Protected guard={isAuthed}>
          <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Protected>
      </Stack>
    </View>
  )
}
