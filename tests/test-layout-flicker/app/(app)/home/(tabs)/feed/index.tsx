import { Link } from 'one'
import { View, Text, StyleSheet } from 'react-native'

// feed page - SPA mode (no suffix, uses default)
// shows MainHeader via the (tabs)/_layout.tsx
// clicking "App Logo" navigates to / which causes the layout flash

export default function FeedPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} id="feed-title">
        Feed
      </Text>

      <Text style={styles.content}>
        This is the feed page. Click the "App Logo" in the header to go back to the
        landing page. This navigation should NOT cause a layout flash - the header should
        transition smoothly.
      </Text>

      <View style={styles.items}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.itemTitle}>Feed Item {i}</Text>
            <Text style={styles.itemContent}>Some content for feed item {i}</Text>
          </View>
        ))}
      </View>

      <View style={styles.links}>
        <Link href="/" id="link-home">
          <Text style={styles.link}>← Back to Landing</Text>
        </Link>
        <Link href="/home/profile" id="link-profile">
          <Text style={styles.link}>Profile →</Text>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#111',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  content: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
    lineHeight: 20,
  },
  items: {
    gap: 12,
    marginBottom: 24,
  },
  item: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemContent: {
    fontSize: 14,
    color: '#666',
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
