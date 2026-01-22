import { Link } from 'one'
import { View, Text, StyleSheet } from 'react-native'

// profile page - SPA mode

export default function ProfilePage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} id="profile-title">
        Profile
      </Text>

      <Text style={styles.content}>This is the profile page.</Text>

      <View style={styles.links}>
        <Link href="/home/feed" id="link-feed">
          <Text style={styles.link}>← Feed</Text>
        </Link>
        <Link href="/" id="link-home">
          <Text style={styles.link}>Landing →</Text>
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
