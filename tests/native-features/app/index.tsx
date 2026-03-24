import { useRouter } from 'one'
import { Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'

const testScreens = [
  { href: '/color-test', label: 'Color API', testID: 'nav-color-test' },
  { href: '/zoom-test', label: 'Zoom Transitions', testID: 'nav-zoom-test' },
  { href: '/toolbar-test', label: 'Toolbar', testID: 'nav-toolbar-test' },
  { href: '/menu-test', label: 'Menu Actions', testID: 'nav-menu-test' },
  { href: '/split-view-test', label: 'Split View', testID: 'nav-split-view-test' },
] as const

export default function HomeScreen() {
  const router = useRouter()

  const go = (href: string) => {
    console.log('[NAV] pushing', href)
    try {
      router.push(href as any)
    } catch (e: any) {
      console.error('[NAV] error', e)
      Alert.alert('Nav Error', e.message)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="home-screen"
    >
      <Text testID="home-title" style={styles.title}>
        @vxrn/native Test Suite
      </Text>

      <Text testID="home-subtitle" style={styles.subtitle}>
        Tap a test to navigate
      </Text>

      {testScreens.map((screen) => (
        <TouchableOpacity
          key={screen.href}
          testID={screen.testID}
          style={styles.card}
          activeOpacity={0.6}
          onPress={() => go(screen.href)}
        >
          <Text style={styles.cardText}>{screen.label}</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 80,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 18,
    color: '#999',
  },
})
