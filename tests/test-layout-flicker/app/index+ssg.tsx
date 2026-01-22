import { Link } from 'one'
import { View, Text, StyleSheet } from 'react-native'

// home page - should show SiteHeader (not MainHeader)
// this is the landing page similar to takeout's /

export default function HomePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} id="page-title">
        Landing Page
      </Text>

      <Text style={styles.subtitle}>
        The only startup starter that gives you an actual edge.
      </Text>

      <View style={styles.cta}>
        <Link href="/home/feed" id="cta-login">
          <View style={styles.button}>
            <Text style={styles.buttonText}>Go to Feed (Login)</Text>
          </View>
        </Link>
      </View>

      <View style={styles.links}>
        <Link href="/docs" id="link-docs">
          <Text style={styles.link}>Docs</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#111',
    minHeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 32,
    textAlign: 'center',
  },
  cta: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#f90',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    color: '#666',
    fontSize: 14,
  },
})
