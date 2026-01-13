import { View, Text, Platform } from 'react-native'
import { useRouter } from 'one'

export default function ProtectedTestIndex() {
  const router = useRouter()

  const navigateToDashboard = () => {
    router.navigate('/protected-test/dashboard')
  }

  const navigateToSettings = () => {
    router.navigate('/protected-test/settings')
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="public-page" accessibilityLabel="Public Page">
        Public Page
      </Text>

      {Platform.OS === 'web' ? (
        <>
          <button
            data-testid="link-dashboard"
            onClick={navigateToDashboard}
            style={{ padding: 10, marginTop: 10, cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
          <button
            data-testid="link-settings"
            onClick={navigateToSettings}
            style={{ padding: 10, marginTop: 10, cursor: 'pointer' }}
          >
            Go to Settings
          </button>
        </>
      ) : (
        <>
          <Text
            testID="link-dashboard"
            onPress={navigateToDashboard}
            style={{ padding: 10, marginTop: 10 }}
          >
            Go to Dashboard
          </Text>
          <Text
            testID="link-settings"
            onPress={navigateToSettings}
            style={{ padding: 10, marginTop: 10 }}
          >
            Go to Settings
          </Text>
        </>
      )}
    </View>
  )
}
