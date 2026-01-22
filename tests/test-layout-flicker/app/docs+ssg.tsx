import { Link } from 'one'
import { View, Text, StyleSheet } from 'react-native'

// docs page - should show SiteHeader

export default function DocsPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} id="docs-title">
        Documentation
      </Text>

      <Text style={styles.content}>
        This is the docs page. It shows the SiteHeader because it's not under /home.
      </Text>

      <View style={styles.links}>
        <Link href="/" id="link-home">
          <Text style={styles.link}>← Back to Home</Text>
        </Link>
        <Link href="/home/feed" id="link-feed">
          <Text style={styles.link}>Go to Feed →</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
    backgroundColor: '#111',
    minHeight: 400,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  links: {
    flexDirection: 'row',
    gap: 24,
  },
  link: {
    color: '#f90',
    fontSize: 14,
  },
})
