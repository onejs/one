import { useState } from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { Stack, Protected } from 'one'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function ProtectedTestLayout() {
  const [isAuthed, setIsAuthed] = useState(false)

  const toggleAuth = () => {
    setIsAuthed(!isAuthed)
  }

  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 10, paddingBottom: 10, backgroundColor: '#eee' }}>
        <Text
          testID="auth-status"
          accessibilityLabel={`Auth: ${isAuthed ? 'true' : 'false'}`}
        >
          Auth: {isAuthed ? 'true' : 'false'}
        </Text>
        {Platform.OS === 'web' ? (
          <button
            data-testid="toggle-auth"
            onClick={toggleAuth}
            style={{
              padding: 10,
              backgroundColor: '#007AFF',
              marginTop: 5,
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Toggle Auth
          </button>
        ) : (
          <TouchableOpacity
            testID="toggle-auth"
            onPress={toggleAuth}
            style={{ padding: 10, backgroundColor: '#007AFF', marginTop: 5 }}
            accessibilityRole="button"
          >
            <Text style={{ color: 'white' }}>Toggle Auth</Text>
          </TouchableOpacity>
        )}
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
